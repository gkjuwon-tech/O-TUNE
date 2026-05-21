"""End-to-end dev pipeline smoke test.

Walks every stage of the real pipeline with Qwen-0.5B + local FS + a tiny
dataset, bypassing Stripe.

    python scripts/run_dev_pipeline.py
    python scripts/run_dev_pipeline.py --stage dataset
    python scripts/run_dev_pipeline.py --project proj_xyz --stage train

Stages: scope · corpus · benchmark · dataset · train · eval · playground
"""
from __future__ import annotations

import argparse
import asyncio
import sys
import time
from pathlib import Path

# Make `otune.*` importable when running from /api
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from otune.config import settings
from otune.db import get_session, init_db
from otune.models import Project, Stage, PaymentState, new_id
from otune.services import benchmark, dataset, training, evaluate, storage
from otune.services.events import emit


PROJECT_DEFAULTS = {
    "name": "Dev tune — medical device support",
    "domain": "medical device support",
    "task_type": "qa",
    "description": (
        "Field service engineers troubleshoot the Acme AP-300 medical pump. "
        "We want a model that answers part-number, torque, and error-code lookups "
        "with citations, and that refuses confidently when the answer isn't in the manual."
    ),
}


def stage_scope() -> str:
    with get_session() as db:
        p = Project(
            id=new_id(),
            stage=Stage.draft,
            payment_state=PaymentState.deposit_paid,   # bypass Stripe
            **PROJECT_DEFAULTS,
        )
        db.add(p); db.flush()
        emit(db, p.id, "draft", "dev pipeline · scope created")
        print(f"  project_id = {p.id}")
        return p.id


def stage_corpus(pid: str) -> None:
    fixture = Path(__file__).parent / "fixtures" / "seed_corpus.txt"
    seed = fixture.read_text(encoding="utf-8") if fixture.exists() else "(no fixture)"
    storage.write_text(pid, "corpus.txt", seed)
    with get_session() as db:
        p = db.get(Project, pid); assert p
        p.corpus_files = [{"name": "service_manual_v3.txt", "bytes": len(seed)}]
        emit(db, p.id, "corpus", f"seeded {len(seed)} bytes")


def stage_benchmark(pid: str) -> None:
    with get_session() as db:
        p = db.get(Project, pid); assert p
        rec = benchmark.recommend(p)
        rec["base_model"] = settings().otune_dev_base_model       # force Qwen-0.5B
        rec["dataset_rows"] = settings().otune_dev_dataset_rows
        p.base_model = rec["base_model"]
        p.base_model_reason = rec["base_model_reason"]
        p.alternatives = rec["alternatives"]
        p.gpu_type = "local"
        p.gpu_hours_estimate = 0.5
        p.quote_usd = 0
        p.deposit_usd = 0
        p.accuracy_target = rec["accuracy_target"]
        p.eta_hours = rec["eta_hours"]
        p.rows_target = rec["dataset_rows"]
        p.stage = Stage.quoted
        emit(db, p.id, "quoted", f"forced base: {p.base_model}", level="success")
        print(f"  base_model = {p.base_model}")
        print(f"  rows_target = {p.rows_target}")


def stage_dataset(pid: str) -> None:
    with get_session() as db:
        p = db.get(Project, pid); assert p
        p.stage = Stage.generating_dataset
        asyncio.run(dataset.generate(db, p, target=settings().otune_dev_dataset_rows))


def stage_train(pid: str) -> None:
    with get_session() as db:
        p = db.get(Project, pid); assert p
        p.stage = Stage.training
        training.run(db, p)


def stage_eval(pid: str) -> None:
    with get_session() as db:
        p = db.get(Project, pid); assert p
        p.stage = Stage.evaluating
        report = evaluate.run(db, p)
        print(f"  pass_rate = {report['pass_rate']:.2%} ({report['n']} graded)")
        p.stage = Stage.playground_ready
        emit(db, p.id, "pipeline", "playground ready — dev mode (no final payment needed)", level="success")


def stage_playground(pid: str) -> None:
    from otune.services import local_inference
    with get_session() as db:
        p = db.get(Project, pid); assert p
        q = "What is the recommended torque for the M6 securing screw on the v3 pump head?"
        print(f"\n  Q: {q}")
        r = local_inference.chat(p, q, max_new_tokens=160)
        print(f"  A ({r['latency_ms']} ms): {r['reply']}\n")


STAGES = {
    "scope": stage_scope,
    "corpus": stage_corpus,
    "benchmark": stage_benchmark,
    "dataset": stage_dataset,
    "train": stage_train,
    "eval": stage_eval,
    "playground": stage_playground,
}
ORDER = ["scope", "corpus", "benchmark", "dataset", "train", "eval", "playground"]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", help="existing project id (skip scope)")
    ap.add_argument("--stage", choices=ORDER, help="run only this stage")
    args = ap.parse_args()

    if not settings().is_dev:
        print("OTUNE_MODE is not 'dev'. Aborting.")
        sys.exit(1)
    if not settings().anthropic_api_key:
        print("ANTHROPIC_API_KEY not set. Aborting.")
        sys.exit(1)

    init_db()
    pid = args.project
    started = time.perf_counter()

    if args.stage:
        # Single stage
        if args.stage == "scope":
            pid = stage_scope()
        else:
            assert pid, "--project required for non-scope single stage"
            print(f"[*]  {args.stage}")
            STAGES[args.stage](pid)
        return

    # Full run
    for i, name in enumerate(ORDER):
        print(f"[{i+1:02d}] {name}")
        if name == "scope":
            pid = stage_scope()
        else:
            STAGES[name](pid)

    dt = time.perf_counter() - started
    print(f"\nPipeline finished in {dt:.1f}s.")
    print(f"  Project ID: {pid}")
    print(f"  Playground: http://localhost:3000/dashboard/projects/{pid}")
    print(f"  Artifacts:  ./data/projects/{pid}/")


if __name__ == "__main__":
    main()
