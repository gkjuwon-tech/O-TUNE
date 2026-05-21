"""Local inference using transformers. Used by the playground in dev mode."""
from __future__ import annotations

import logging
import time
from functools import lru_cache
from pathlib import Path
from typing import Any

from ..config import settings
from ..models import Project
from . import storage

log = logging.getLogger(__name__)


@lru_cache(maxsize=4)
def _load(project_id: str, base_model: str, adapter_path: str) -> tuple[Any, Any]:
    """Load base + adapter once per project. LRU keeps a few in memory."""
    import torch
    from peft import PeftModel
    from transformers import AutoModelForCausalLM, AutoTokenizer

    log.info("loading model for %s: base=%s adapter=%s", project_id, base_model, adapter_path)
    tok = AutoTokenizer.from_pretrained(base_model, trust_remote_code=True,
                                        token=settings().huggingface_token or None)
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token
    base = AutoModelForCausalLM.from_pretrained(
        base_model,
        torch_dtype=torch.float32 if not torch.cuda.is_available() else torch.bfloat16,
        device_map="auto" if torch.cuda.is_available() else None,
        trust_remote_code=True,
        token=settings().huggingface_token or None,
    )
    if adapter_path and Path(adapter_path).exists():
        model = PeftModel.from_pretrained(base, adapter_path)
    else:
        model = base
    model.eval()
    return tok, model


def chat(project: Project, message: str, max_new_tokens: int = 256) -> dict:
    import torch

    base_model = project.base_model or settings().otune_dev_base_model
    adapter = project.artifact_uri or str(storage.model_dir(project.id) / "adapter")
    tok, model = _load(project.id, base_model, adapter)

    chat_msgs = [
        {"role": "system", "content": (
            f"You are a tuned assistant for the domain: {project.domain}. "
            "Answer concisely, cite sources when present, refuse if the corpus doesn't cover the question."
        )},
        {"role": "user", "content": message},
    ]
    text = tok.apply_chat_template(chat_msgs, tokenize=False, add_generation_prompt=True)
    inputs = tok(text, return_tensors="pt")
    if torch.cuda.is_available():
        inputs = {k: v.to("cuda") for k, v in inputs.items()}

    t0 = time.perf_counter()
    with torch.no_grad():
        out = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=True, temperature=0.4, top_p=0.9,
            pad_token_id=tok.pad_token_id,
        )
    latency_ms = int((time.perf_counter() - t0) * 1000)
    reply = tok.decode(out[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True).strip()
    return {"reply": reply, "latency_ms": latency_ms, "tokens": int(out.shape[1])}
