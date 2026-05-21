"""Dataset generation: Claude writes exam-grade rows across 10 fields.

In dev mode we target 100 rows by default (override with OTUNE_DEV_DATASET_ROWS).
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from anthropic import AsyncAnthropic
from sqlalchemy.orm import Session
from tenacity import retry, stop_after_attempt, wait_exponential

from ..config import settings
from ..models import Project
from . import storage
from .events import emit

log = logging.getLogger(__name__)

FIELDS = [
    "question", "context", "gold_answer", "distractors", "citations",
    "difficulty", "rubric", "domain_tags", "source_span", "follow_up",
]

BATCH_PROMPT = """You are O'Tune's dataset author. Produce {batch_size} high-quality exam-style
training rows for the customer below.

Customer:
- Domain: {domain}
- Task:   {task_type}
- Description: {description}

Each row MUST be a single-line JSON object with these fields:
{fields}

Hard rules:
- `gold_answer` must be defensible and citable from `context`.
- `distractors` is a list of 3 objects {{"text": ..., "why_wrong": ...}}.
- `difficulty` is one of "easy", "medium", "hard", "trap".
- `rubric` is a list of 2-4 short bullets the grader should check.
- `citations` is a list of source identifiers.
- `domain_tags` is a list of 1-3 short tags.
- Refusals are valid: include some rows where `gold_answer` says the answer is not
  in the corpus and `rubric` requires that refusal.
- Vary phrasing, length, and difficulty. Avoid duplication across the batch.

Return EXACTLY {batch_size} JSON objects, ONE PER LINE, no markdown, no commentary."""


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=2, max=8))
async def _batch(client: AsyncAnthropic, project: Project, batch_size: int) -> list[dict[str, Any]]:
    msg = await client.messages.create(
        model=settings().otune_claude_model,
        max_tokens=8192,
        messages=[{
            "role": "user",
            "content": BATCH_PROMPT.format(
                domain=project.domain,
                task_type=project.task_type,
                description=project.description or "(none)",
                fields="\n".join(f"- {f}" for f in FIELDS),
                batch_size=batch_size,
            ),
        }],
    )
    text = "".join(b.text for b in msg.content if hasattr(b, "text"))
    rows: list[dict[str, Any]] = []
    for line in text.splitlines():
        line = line.strip().rstrip(",")
        if not line.startswith("{"):
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return rows


async def generate(db: Session, project: Project, target: int | None = None, batch_size: int = 10, parallel: int = 3) -> int:
    """Generate rows in parallel batches and append to project's dataset.jsonl."""
    if target is None:
        target = settings().otune_dev_dataset_rows if settings().is_dev else project.rows_target

    project.rows_target = target
    project.rows_generated = 0
    db.flush()
    emit(db, project.id, "generating_dataset", f"target {target} rows × {len(FIELDS)} fields")
    db.commit()

    client = AsyncAnthropic(api_key=settings().anthropic_api_key)
    produced = 0

    while produced < target:
        coros = [_batch(client, project, batch_size) for _ in range(parallel)]
        results = await asyncio.gather(*coros, return_exceptions=True)
        new_this_round = 0
        for r in results:
            if isinstance(r, Exception):
                emit(db, project.id, "generating_dataset", f"batch error: {r}", level="warn")
                continue
            for row in r:
                if produced + new_this_round >= target:
                    break
                row["_id"] = f"{produced + new_this_round:05d}"
                storage.append_jsonl(project.id, "dataset.jsonl", row)
                new_this_round += 1
        produced += new_this_round
        project.rows_generated = min(target, produced)
        db.flush()
        emit(db, project.id, "generating_dataset", f"{produced}/{target} rows written")
        db.commit()
        if new_this_round == 0:
            emit(db, project.id, "generating_dataset", "no rows produced this pass — stopping", level="warn")
            break

    emit(db, project.id, "generating_dataset", "dataset complete", level="success")
    return produced
