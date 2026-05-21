"""Benchmark agent: Tavily-search the field, then ask Claude to recommend a base model + quote."""
from __future__ import annotations

import json
import logging
import math
from typing import Any

import httpx
from anthropic import Anthropic
from tenacity import retry, stop_after_attempt, wait_exponential

from ..config import settings
from ..models import Project

log = logging.getLogger(__name__)


# Honest, conservative GPU pricing (USD/hr) — close to RunPod community-cloud floors.
GPU_RATES = {
    "NVIDIA H100 80GB HBM3": 3.40,
    "NVIDIA A100 80GB": 1.89,
    "NVIDIA A6000": 0.79,
}

OUR_MARGIN = 2.4  # 2.4x markup over raw GPU cost to cover orchestration, dataset gen, eval, support.
MIN_QUOTE_USD = 4900.0
DATASET_BASE_COST = 1400.0  # Claude tokens for 5k rows @ 10 fields, eval grader passes, S3, etc.


SEARCH_QUERIES = [
    "open llm leaderboard {domain} benchmark",
    "best open source llm for {task_type} {domain} 2025",
    "fine-tuning {domain} dataset size accuracy",
    "MTEB {domain} retrieval scores",
    "LLama Qwen Mistral {domain} comparison",
]


def _tavily_search(q: str) -> list[dict[str, str]]:
    s = settings()
    if not s.tavily_api_key:
        return []
    with httpx.Client(timeout=15) as c:
        r = c.post(
            "https://api.tavily.com/search",
            headers={"Authorization": f"Bearer {s.tavily_api_key}"},
            json={
                "query": q,
                "search_depth": "basic",
                "max_results": 5,
                "include_answer": False,
            },
        )
        r.raise_for_status()
        items = r.json().get("results", [])
        return [
            {
                "title": i.get("title", ""),
                "snippet": i.get("content", ""),
                "link": i.get("url", ""),
            }
            for i in items
        ]


def _gather_evidence(project: Project) -> list[dict[str, Any]]:
    evidence = []
    for tpl in SEARCH_QUERIES:
        q = tpl.format(domain=project.domain, task_type=project.task_type)
        try:
            results = _tavily_search(q)
            evidence.append({"query": q, "results": results})
        except Exception as e:
            log.warning("tavily search failed for %s: %s", q, e)
            evidence.append({"query": q, "results": [], "error": str(e)})
    return evidence


RECOMMEND_PROMPT = """You are O'TUNE's benchmark agent. Given:

- Customer domain: {domain}
- Task type: {task_type}
- Description: {description}
- Web evidence (search results from leaderboards, papers, vendor sites):

{evidence}

Recommend ONE open-weight base model for this fine-tune. Constraints:
- License must permit enterprise commercial use.
- Pick a model size that the customer's domain actually justifies — do not over-prescribe.
- Common candidates: meta-llama/Llama-3.1-8B-Instruct, meta-llama/Llama-3.1-70B-Instruct, Qwen/Qwen2.5-14B-Instruct, mistralai/Mistral-7B-Instruct-v0.3, mistralai/Mixtral-8x7B-Instruct-v0.1, google/gemma-2-9b-it, deepseek-ai/DeepSeek-V2.5.

Return STRICT JSON only:
{{
  "base_model": "<huggingface id>",
  "base_model_reason": "<2-3 sentences citing the evidence>",
  "alternatives": [
    {{"name": "<hf id>", "reason": "<why not — 1 sentence>"}},
    {{"name": "<hf id>", "reason": "<why not — 1 sentence>"}}
  ],
  "size_class": "8B" | "14B" | "70B",
  "dataset_rows": <int between 5000 and 20000>,
  "gpu_hours_estimate": <float>,
  "accuracy_target": <float 0.0-1.0>,
  "eta_hours": <float>
}}
"""


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def _ask_claude(prompt: str) -> dict[str, Any]:
    client = Anthropic(api_key=settings().anthropic_api_key)
    msg = client.messages.create(
        model=settings().otune_claude_model,
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    text = "".join(b.text for b in msg.content if hasattr(b, "text"))
    # Extract first JSON object.
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end < 0:
        raise ValueError(f"no JSON in claude response: {text[:200]}")
    return json.loads(text[start : end + 1])


def recommend(project: Project) -> dict[str, Any]:
    evidence = _gather_evidence(project)
    evidence_text = json.dumps(evidence, indent=2)[:8000]
    prompt = RECOMMEND_PROMPT.format(
        domain=project.domain,
        task_type=project.task_type,
        description=project.description or "(none provided)",
        evidence=evidence_text,
    )
    try:
        rec = _ask_claude(prompt)
    except Exception as e:
        log.warning("Claude recommend failed, falling back: %s", e)
        rec = _fallback(project)

    size = rec.get("size_class", "8B")
    gpu_type = settings().runpod_gpu_type_70b if size == "70B" else settings().runpod_gpu_type_8b
    gpu_hours = float(rec.get("gpu_hours_estimate", 18 if size == "70B" else 6))
    gpu_cost = gpu_hours * GPU_RATES.get(gpu_type, 1.89)
    raw = gpu_cost + DATASET_BASE_COST
    total = max(MIN_QUOTE_USD, math.ceil(raw * OUR_MARGIN / 100) * 100)
    deposit = total / 2

    return {
        "base_model": rec["base_model"],
        "base_model_reason": rec["base_model_reason"],
        "alternatives": rec.get("alternatives", []),
        "dataset_rows": int(rec.get("dataset_rows", 5000)),
        "dataset_fields": 10,
        "gpu_type": gpu_type,
        "gpu_hours_estimate": gpu_hours,
        "total_usd": total,
        "deposit_usd": deposit,
        "accuracy_target": float(rec.get("accuracy_target", 0.85)),
        "eta_hours": float(rec.get("eta_hours", 6)),
    }


def _fallback(project: Project) -> dict[str, Any]:
    return {
        "base_model": "meta-llama/Llama-3.1-8B-Instruct",
        "base_model_reason": "Strong open license, well-supported in axolotl, calibrated for instruction following. Default fit when domain evidence is sparse.",
        "alternatives": [
            {"name": "Qwen/Qwen2.5-14B-Instruct", "reason": "Stronger reasoning but heavier — only worth it if the task benefits from chain-of-thought."},
            {"name": "mistralai/Mistral-7B-Instruct-v0.3", "reason": "Faster inference; slightly weaker on multi-step reasoning vs Llama 3.1."},
        ],
        "size_class": "8B",
        "dataset_rows": 5000,
        "gpu_hours_estimate": 6.0,
        "accuracy_target": 0.85,
        "eta_hours": 6.0,
    }
