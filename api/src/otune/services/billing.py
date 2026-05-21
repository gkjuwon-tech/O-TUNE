"""Stripe split-billing: 50% deposit up front, 50% on playground acceptance."""
from __future__ import annotations

import logging
from typing import Literal

import stripe

from ..config import settings
from ..models import Project, PaymentState, Stage

log = logging.getLogger(__name__)


def _init():
    stripe.api_key = settings().stripe_api_key


def create_checkout(project: Project, kind: Literal["deposit", "final"]) -> str:
    _init()
    amount_usd = (project.deposit_usd if kind == "deposit" else (project.quote_usd or 0) - (project.deposit_usd or 0))
    if amount_usd <= 0:
        raise ValueError("no amount due")
    fe = settings().otune_frontend_url
    session = stripe.checkout.Session.create(
        mode="payment",
        success_url=f"{fe}/dashboard/projects/{project.id}?paid={kind}",
        cancel_url=f"{fe}/dashboard/projects/{project.id}?canceled={kind}",
        line_items=[{
            "quantity": 1,
            "price_data": {
                "currency": "usd",
                "unit_amount": int(round(amount_usd * 100)),
                "product_data": {
                    "name": f"O'TUNE {kind.title()} — {project.name}",
                    "description": (
                        f"50% deposit for fine-tune of {project.base_model}"
                        if kind == "deposit"
                        else f"Final 50% — release weights for {project.name}"
                    ),
                },
            },
        }],
        metadata={"project_id": project.id, "kind": kind},
    )
    return session.url


def handle_webhook(raw_body: bytes, sig: str) -> tuple[str | None, str | None]:
    """Returns (project_id, kind) when payment succeeded. Verifies signature."""
    _init()
    event = stripe.Webhook.construct_event(raw_body, sig, settings().stripe_webhook_secret)
    if event["type"] != "checkout.session.completed":
        return None, None
    md = event["data"]["object"].get("metadata", {}) or {}
    return md.get("project_id"), md.get("kind")


def apply_payment(project: Project, kind: str) -> None:
    if kind == "deposit":
        project.payment_state = PaymentState.deposit_paid
        if project.stage in (Stage.quoted, Stage.deposit_pending, Stage.draft):
            project.stage = Stage.deposit_paid
    elif kind == "final":
        project.payment_state = PaymentState.final_paid
        project.stage = Stage.delivered
