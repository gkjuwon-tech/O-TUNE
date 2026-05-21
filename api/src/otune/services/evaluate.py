"""Senior-model exam: Claude grades the tuned model against held-out rows."""
from __future__ import annotations

import json
import logging
from collections import defaultdict
from typing import Any

from anthropic import Anthropic
from sqlalchemy.orm import Session

from ..config import settings
from ..models import Project
from . import storage
from .events import emit

log = logging.getLogger(__name__)


GRADER_SYSTEM = """You are a senior grader for fine-tuned LLMs. You receive:
- A held-out question with a rubric and a RAG-grounded gold answer.
- The tuned model's response.

Score from 0.0 to 1.0. Return ONLY a JSON object:
{"score": <float>, "category": "<short tag>", "rationale": "<2 sentences>"}"""


def _tuned_response(project: Project, question: dict[str, Any]) -> str:
    """Ask the locally-loaded tuned model to answer one question."""
    if settings().is_dev:
        from . import local_inference
        q = question.get("question", "")
        ctx = question.get("context", "")
        prompt = f"Context:\n{ctx}\n\nQuestion: {q}" if ctx else q
        r = local_inference.chat(project, prompt, max_new_tokens=192)
        return r["reply"]
    return "(prod inference stub)"


def _grade_one(client: Anthropic, q: dict[str, Any], answer: str) -> dict[str, Any]:
    rubric = q.get("rubric") or []
    user = (
        f"Question: {q.get('question', '')}\n"
        f"Rubric:\n" + "\n".join(f"- {r}" for r in rubric) + "\n"
        f"Gold answer: {q.get('gold_answer', '')}\n"
        f"Tuned model response: {answer}\n\nGrade now."
    )
    msg = client.messages.create(
        model=settings().otune_claude_model,
        max_tokens=512,
        system=GRADER_SYSTEM,
        messages=[{"role": "user", "content": user}],
    )
    text = "".join(b.text for b in msg.content if hasattr(b, "text"))
    s, e = text.find("{"), text.rfind("}")
    return json.loads(text[s : e + 1])


def run(db: Session, project: Project, held_out: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    if held_out is None:
        held_out = storage.read_jsonl(project.id, "held_out.jsonl")
    if not held_out:
        emit(db, project.id, "evaluating", "no held-out set found — skipping", level="warn")
        return {"pass_rate": 0.0, "n": 0, "miss_clusters": {}}

    client = Anthropic(api_key=settings().anthropic_api_key)
    emit(db, project.id, "evaluating", f"grading {len(held_out)} held-out questions")
    db.commit()

    scores: list[float] = []
    miss_clusters: dict[str, list[dict[str, Any]]] = defaultdict(list)
    detailed = []

    for q in held_out:
        try:
            ans = _tuned_response(project, q)
            g = _grade_one(client, q, ans)
            scores.append(float(g.get("score", 0.0)))
            detailed.append({"q": q, "answer": ans, "grade": g})
            if g.get("score", 1.0) < 0.6:
                miss_clusters[g.get("category", "other")].append({"q": q, "grade": g})
        except Exception as e:
            emit(db, project.id, "evaluating", f"grader error on {q.get('_id')}: {e}", level="warn")
            continue

    pass_rate = sum(scores) / max(1, len(scores))
    storage.write_json(project.id, "eval_report.json", {
        "pass_rate": pass_rate, "n": len(scores),
        "miss_clusters": {k: len(v) for k, v in miss_clusters.items()},
        "detailed": detailed,
    })
    project.eval_report_uri = str(storage.project_dir(project.id) / "eval_report.json")
    emit(db, project.id, "evaluating", f"pass-rate {pass_rate:.2%} ({len(scores)} graded)", level="success")
    db.commit()
    return {"pass_rate": pass_rate, "n": len(scores), "miss_clusters": dict(miss_clusters)}
