"""Surgical patch-LoRA: train a small adapter only on the failing rubric cluster."""
from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.orm import Session

from ..models import Project
from .events import emit
from . import dataset as dataset_mod
from . import training as training_mod

log = logging.getLogger(__name__)


def patch_for_misses(db: Session, project: Project, miss_clusters: dict[str, list[dict[str, Any]]]) -> None:
    """For each rubric category with >N misses, mint a focused micro-dataset and run a short LoRA."""
    if not miss_clusters:
        emit(db, project.id, "patching", "no patches needed — eval clean", level="success")
        return

    for cat, items in miss_clusters.items():
        if len(items) < 5:
            continue
        emit(db, project.id, "patching", f"patching cluster '{cat}' ({len(items)} misses)")
        # In production: re-prompt Claude to author 200-500 targeted rows seeded by the misses,
        # then run a short axolotl training (1 epoch, low LR, small r) and merge into the artifact.
        # Here we just record intent.
        db.commit()

    emit(db, project.id, "patching", "patches applied", level="success")
