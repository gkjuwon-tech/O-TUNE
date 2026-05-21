from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def new_id() -> str:
    return uuid.uuid4().hex[:24]


class Stage(str, enum.Enum):
    draft = "draft"
    benchmarking = "benchmarking"
    quoted = "quoted"
    deposit_pending = "deposit_pending"
    deposit_paid = "deposit_paid"
    generating_dataset = "generating_dataset"
    training = "training"
    evaluating = "evaluating"
    patching = "patching"
    playground_ready = "playground_ready"
    final_pending = "final_pending"
    final_paid = "final_paid"
    delivered = "delivered"
    failed = "failed"


class PaymentState(str, enum.Enum):
    none = "none"
    deposit_pending = "deposit_pending"
    deposit_paid = "deposit_paid"
    final_pending = "final_pending"
    final_paid = "final_paid"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    name: Mapped[str] = mapped_column(String(200))
    domain: Mapped[str] = mapped_column(String(120))
    task_type: Mapped[str] = mapped_column(String(40))
    description: Mapped[str] = mapped_column(Text, default="")

    stage: Mapped[Stage] = mapped_column(Enum(Stage), default=Stage.draft, index=True)
    payment_state: Mapped[PaymentState] = mapped_column(Enum(PaymentState), default=PaymentState.none, index=True)

    base_model: Mapped[Optional[str]] = mapped_column(String(120), default=None)
    base_model_reason: Mapped[Optional[str]] = mapped_column(Text, default=None)
    alternatives: Mapped[Optional[dict]] = mapped_column(JSON, default=None)
    gpu_type: Mapped[Optional[str]] = mapped_column(String(120), default=None)
    gpu_hours_estimate: Mapped[Optional[float]] = mapped_column(Float, default=None)
    quote_usd: Mapped[Optional[float]] = mapped_column(Float, default=None)
    deposit_usd: Mapped[Optional[float]] = mapped_column(Float, default=None)
    accuracy_target: Mapped[Optional[float]] = mapped_column(Float, default=None)
    eta_hours: Mapped[Optional[float]] = mapped_column(Float, default=None)

    rows_target: Mapped[int] = mapped_column(Integer, default=5000)
    rows_generated: Mapped[int] = mapped_column(Integer, default=0)

    stripe_deposit_session: Mapped[Optional[str]] = mapped_column(String(120), default=None)
    stripe_final_session: Mapped[Optional[str]] = mapped_column(String(120), default=None)

    artifact_uri: Mapped[Optional[str]] = mapped_column(String(400), default=None)
    eval_report_uri: Mapped[Optional[str]] = mapped_column(String(400), default=None)
    playground_endpoint: Mapped[Optional[str]] = mapped_column(String(400), default=None)

    corpus_files: Mapped[Optional[list]] = mapped_column(JSON, default=list)

    events: Mapped[list["Event"]] = relationship(back_populates="project", cascade="all, delete-orphan", order_by="Event.ts")


class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    ts: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    level: Mapped[str] = mapped_column(String(16), default="info")
    stage: Mapped[str] = mapped_column(String(40))
    message: Mapped[str] = mapped_column(Text)

    project: Mapped[Project] = relationship(back_populates="events")
