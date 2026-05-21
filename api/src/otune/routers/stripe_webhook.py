from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request

from ..db import get_session
from ..models import Project
from ..services import billing, pipeline
from ..services.events import emit

log = logging.getLogger(__name__)
router = APIRouter(prefix="/stripe", tags=["stripe"])


def _kickoff_pipeline(project_id: str) -> None:
    """Run pipeline in background. New DB session per task."""
    with get_session() as db:
        p = db.get(Project, project_id)
        if not p:
            return
        asyncio.run(pipeline.run_pipeline(db, p))


@router.post("/webhook")
async def webhook(request: Request, background: BackgroundTasks, stripe_signature: str = Header(default="")):
    raw = await request.body()
    try:
        project_id, kind = billing.handle_webhook(raw, stripe_signature)
    except Exception as e:
        log.warning("invalid stripe webhook: %s", e)
        raise HTTPException(400, "invalid signature")
    if not project_id or not kind:
        return {"ok": True}

    with get_session() as db:
        p = db.get(Project, project_id)
        if not p:
            raise HTTPException(404)
        billing.apply_payment(p, kind)
        emit(db, p.id, "billing", f"{kind} payment received", level="success")

    if kind == "deposit":
        background.add_task(_kickoff_pipeline, project_id)
    return {"ok": True}
