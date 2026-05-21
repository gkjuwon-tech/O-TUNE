"""Local LoRA training with transformers + PEFT. Used in dev mode (no RunPod).

Trains Qwen2.5-0.5B-Instruct on the dataset.jsonl produced by `dataset.py`.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path

from sqlalchemy.orm import Session

from ..config import settings
from ..models import Project
from . import storage
from .events import emit

log = logging.getLogger(__name__)


def _build_chat(row: dict) -> list[dict]:
    """Convert one dataset row into a chat-format conversation."""
    user = row.get("question", "")
    ctx = row.get("context", "")
    gold = row.get("gold_answer", "")
    cites = row.get("citations") or []
    cite_str = f"\n\nCitations: {', '.join(cites)}" if cites else ""
    user_msg = f"Context:\n{ctx}\n\nQuestion: {user}" if ctx else user
    return [
        {"role": "user", "content": user_msg},
        {"role": "assistant", "content": f"{gold}{cite_str}"},
    ]


def run(db: Session, project: Project) -> None:
    """Train a LoRA adapter on the project's dataset.

    Heavy imports happen inside the function so they don't slow API startup.
    """
    import torch
    from datasets import Dataset
    from peft import LoraConfig, get_peft_model
    from transformers import (
        AutoModelForCausalLM,
        AutoTokenizer,
        DataCollatorForLanguageModeling,
        Trainer,
        TrainingArguments,
    )

    s = settings()
    base = project.base_model or s.otune_dev_base_model
    out_dir = storage.model_dir(project.id)

    emit(db, project.id, "training", f"loading base model: {base}")
    db.commit()

    tok = AutoTokenizer.from_pretrained(base, trust_remote_code=True, token=s.huggingface_token or None)
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        base,
        torch_dtype=torch.float32 if not torch.cuda.is_available() else torch.bfloat16,
        device_map="auto" if torch.cuda.is_available() else None,
        trust_remote_code=True,
        token=s.huggingface_token or None,
    )

    lora_cfg = LoraConfig(
        r=s.otune_dev_lora_r,
        lora_alpha=s.otune_dev_lora_r * 2,
        lora_dropout=0.05,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
        task_type="CAUSAL_LM",
    )
    model = get_peft_model(model, lora_cfg)
    n_trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    emit(db, project.id, "training", f"trainable params: {n_trainable:,}")
    db.commit()

    rows = storage.read_jsonl(project.id, "dataset.jsonl")
    if not rows:
        raise RuntimeError("dataset.jsonl is empty — run dataset stage first")

    def tokenize(row: dict) -> dict:
        chat = _build_chat(row)
        text = tok.apply_chat_template(chat, tokenize=False, add_generation_prompt=False)
        ids = tok(text, truncation=True, max_length=1024, padding="max_length")
        ids["labels"] = ids["input_ids"].copy()
        return ids

    ds = Dataset.from_list(rows).map(tokenize, remove_columns=list(rows[0].keys()))

    # Split: last 20% reserved for eval (also written to held_out.jsonl for grader)
    split = ds.train_test_split(test_size=0.2, seed=42)
    train_ds, eval_ds = split["train"], split["test"]
    held_out = [rows[i] for i in eval_ds["labels"].__class__ and range(len(eval_ds))]  # noqa
    # Simpler: take last 20% of original rows
    cut = int(len(rows) * 0.8)
    held_rows = rows[cut:]
    for r in held_rows:
        storage.append_jsonl(project.id, "held_out.jsonl", r)

    args = TrainingArguments(
        output_dir=str(out_dir / "checkpoints"),
        num_train_epochs=s.otune_dev_train_epochs,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        learning_rate=s.otune_dev_lr,
        warmup_ratio=0.03,
        logging_steps=5,
        save_strategy="epoch",
        eval_strategy="epoch",
        report_to=[],
        bf16=torch.cuda.is_available(),
        fp16=False,
        remove_unused_columns=False,
    )

    class LoggingTrainer(Trainer):
        def log(self, logs: dict, start_time=None) -> None:  # type: ignore[override]
            super().log(logs, start_time) if start_time is not None else super().log(logs)
            if "loss" in logs:
                emit(db, project.id, "training", f"step {self.state.global_step} loss {logs['loss']:.4f}")
                db.commit()

    trainer = LoggingTrainer(
        model=model,
        args=args,
        train_dataset=train_ds,
        eval_dataset=eval_ds,
        tokenizer=tok,
        data_collator=DataCollatorForLanguageModeling(tok, mlm=False),
    )
    emit(db, project.id, "training", "starting trainer.train()")
    db.commit()

    trainer.train()

    adapter_dir = out_dir / "adapter"
    model.save_pretrained(str(adapter_dir))
    tok.save_pretrained(str(adapter_dir))
    project.artifact_uri = str(adapter_dir)
    emit(db, project.id, "training", f"adapter saved → {adapter_dir}", level="success")
    db.commit()
