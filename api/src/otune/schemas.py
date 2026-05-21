from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    domain: str = Field(min_length=1, max_length=120)
    task_type: str
    description: str = ""


class ProjectOut(BaseModel):
    id: str
    name: str
    domain: str
    task_type: str
    created_at: datetime
    stage: str
    payment_state: str
    base_model: Optional[str] = None
    quote_usd: Optional[float] = None
    accuracy_target: Optional[float] = None
    rows_generated: int
    rows_target: int


class CorpusItem(BaseModel):
    name: str
    bytes: int


class CorpusUpload(BaseModel):
    files: list[CorpusItem]


class Alternative(BaseModel):
    name: str
    reason: str


class QuoteOut(BaseModel):
    base_model: str
    base_model_reason: str
    alternatives: list[Alternative]
    dataset_rows: int
    dataset_fields: int = 10
    gpu_type: str
    gpu_hours_estimate: float
    total_usd: float
    deposit_usd: float
    accuracy_target: float
    eta_hours: float


class EventOut(BaseModel):
    id: str
    ts: datetime
    level: str
    stage: str
    message: str


class ChatIn(BaseModel):
    message: str


class ChatOut(BaseModel):
    reply: str
    latency_ms: int
    tokens: int


class CheckoutOut(BaseModel):
    checkout_url: str
