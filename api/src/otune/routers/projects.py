from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from ..config import settings
from ..db import get_session
from ..models import Project, Stage, PaymentState, new_id
from ..schemas import (
    ProjectCreate, ProjectOut, CorpusUpload, QuoteOut, EventOut,
    CheckoutOut, ChatIn, ChatOut, Alternative,
)
from ..services import benchmark, billing, delivery
from ..services.events import emit

log = logging.getLogger(__name__)
router = APIRouter(prefix="/projects", tags=["projects"])


def _to_out(p: Project) -> ProjectOut:
    return ProjectOut(
        id=p.id, name=p.name, domain=p.domain, task_type=p.task_type,
        created_at=p.created_at, stage=p.stage.value, payment_state=p.payment_state.value,
        base_model=p.base_model, quote_usd=p.quote_usd, accuracy_target=p.accuracy_target,
        rows_generated=p.rows_generated, rows_target=p.rows_target,
    )


@router.get("", response_model=list[ProjectOut])
def list_projects():
    with get_session() as db:
        rows = db.execute(select(Project).order_by(Project.created_at.desc())).scalars().all()
        return [_to_out(p) for p in rows]


@router.post("", response_model=ProjectOut)
def create(body: ProjectCreate):
    with get_session() as db:
        p = Project(
            id=new_id(),
            name=body.name, domain=body.domain, task_type=body.task_type,
            description=body.description, stage=Stage.draft, payment_state=PaymentState.none,
        )
        db.add(p); db.flush()
        emit(db, p.id, "draft", f"project '{p.name}' created")
        return _to_out(p)


@router.get("/{project_id}", response_model=ProjectOut)
def get(project_id: str):
    with get_session() as db:
        p = db.get(Project, project_id)
        if not p: raise HTTPException(404)
        return _to_out(p)


@router.post("/{project_id}/corpus")
def upload_corpus(project_id: str, body: CorpusUpload):
    with get_session() as db:
        p = db.get(Project, project_id)
        if not p: raise HTTPException(404)
        p.corpus_files = [f.model_dump() for f in body.files]
        emit(db, p.id, "corpus", f"received {len(body.files)} files")
        return {"accepted": len(body.files)}


@router.post("/{project_id}/benchmark", response_model=QuoteOut)
def run_benchmark(project_id: str):
    with get_session() as db:
        p = db.get(Project, project_id)
        if not p: raise HTTPException(404)
        p.stage = Stage.benchmarking
        emit(db, p.id, "benchmarking", "agent crawling benchmarks…")
        db.commit()

        rec = benchmark.recommend(p)

        # In dev mode we force the base model to the small Qwen so training is fast.
        if settings().is_dev:
            rec["base_model"] = settings().otune_dev_base_model
            rec["base_model_reason"] = (
                "Dev mode: forced to Qwen2.5-0.5B-Instruct for fast local PEFT training."
            )
            rec["dataset_rows"] = settings().otune_dev_dataset_rows

        p.base_model = rec["base_model"]
        p.base_model_reason = rec["base_model_reason"]
        p.alternatives = rec["alternatives"]
        p.gpu_type = rec["gpu_type"]
        p.gpu_hours_estimate = rec["gpu_hours_estimate"]
        p.quote_usd = rec["total_usd"]
        p.deposit_usd = rec["deposit_usd"]
        p.accuracy_target = rec["accuracy_target"]
        p.eta_hours = rec["eta_hours"]
        p.rows_target = rec["dataset_rows"]
        p.stage = Stage.quoted
        emit(db, p.id, "quoted", f"recommended {p.base_model} @ ${p.quote_usd:,.0f}", level="success")

        return QuoteOut(
            base_model=p.base_model, base_model_reason=p.base_model_reason or "",
            alternatives=[Alternative(**a) for a in (p.alternatives or [])],
            dataset_rows=p.rows_target, dataset_fields=10,
            gpu_type=p.gpu_type or "", gpu_hours_estimate=p.gpu_hours_estimate or 0,
            total_usd=p.quote_usd or 0, deposit_usd=p.deposit_usd or 0,
            accuracy_target=p.accuracy_target or 0, eta_hours=p.eta_hours or 0,
        )


@router.post("/{project_id}/quote/accept", response_model=CheckoutOut)
def accept_quote(project_id: str):
    with get_session() as db:
        p = db.get(Project, project_id)
        if not p: raise HTTPException(404)
        if not p.quote_usd: raise HTTPException(400, "no quote yet")
        url = billing.create_checkout(p, "deposit")
        p.payment_state = PaymentState.deposit_pending
        p.stage = Stage.deposit_pending
        emit(db, p.id, "billing", "deposit checkout opened")
        return CheckoutOut(checkout_url=url)


@router.post("/{project_id}/final-payment", response_model=CheckoutOut)
def pay_final(project_id: str):
    with get_session() as db:
        p = db.get(Project, project_id)
        if not p: raise HTTPException(404)
        if p.stage not in (Stage.playground_ready, Stage.final_pending):
            raise HTTPException(400, "playground not yet ready")
        url = billing.create_checkout(p, "final")
        p.payment_state = PaymentState.final_pending
        p.stage = Stage.final_pending
        emit(db, p.id, "billing", "final checkout opened")
        return CheckoutOut(checkout_url=url)


@router.get("/{project_id}/events", response_model=list[EventOut])
def events(project_id: str):
    with get_session() as db:
        p = db.get(Project, project_id)
        if not p: raise HTTPException(404)
        return [EventOut(id=e.id, ts=e.ts, level=e.level, stage=e.stage, message=e.message) for e in p.events[-200:]]


@router.post("/{project_id}/playground/chat", response_model=ChatOut)
def playground_chat(project_id: str, body: ChatIn):
    with get_session() as db:
        p = db.get(Project, project_id)
        if not p: raise HTTPException(404)
        if p.stage not in (Stage.playground_ready, Stage.final_pending, Stage.final_paid, Stage.delivered):
            raise HTTPException(400, "playground locked")

        if settings().is_dev:
            from ..services import local_inference
            r = local_inference.chat(p, body.message)
            return ChatOut(**r)

        # prod stub
        return ChatOut(reply="(prod inference not wired)", latency_ms=0, tokens=0)


@router.get("/{project_id}/artifact")
def artifact(project_id: str, fmt: str = "safetensors"):
    with get_session() as db:
        p = db.get(Project, project_id)
        if not p: raise HTTPException(404)
        if p.payment_state != PaymentState.final_paid and p.stage != Stage.delivered:
            raise HTTPException(402, "final payment required")
        if settings().is_dev:
            return {"local_path": p.artifact_uri}
        url = delivery.signed_url(p.id, fmt)
        return {"url": url}
