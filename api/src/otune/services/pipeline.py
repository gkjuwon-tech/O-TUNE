"""End-to-end pipeline runner. Triggered when deposit webhook lands."""
from __future__ import annotations

import asyncio
import logging
from typing import Any

from sqlalchemy.orm import Session

from ..models import Project, Stage
from .events import emit
from . import dataset as dataset_mod
from . import training as training_mod
from . import evaluate as eval_mod
from . import patch as patch_mod
from . import delivery as delivery_mod

log = logging.getLogger(__name__)


async def run_pipeline(db: Session, project: Project) -> None:
    """Run dataset → train → eval → patch → package. Updates stage on each step."""
    try:
        # 1. Dataset
        project.stage = Stage.generating_dataset
        db.commit()
        await dataset_mod.generate(db, project, target=project.rows_target)

        # 2. Train
        project.stage = Stage.training
        db.commit()
        training_mod.run(db, project)

        # 3. Eval
        project.stage = Stage.evaluating
        db.commit()
        held_out: list[dict[str, Any]] = []  # TODO: pull from generated dataset's eval split
        report = eval_mod.run(db, project, held_out)

        # 4. Patch
        if report.get("pass_rate", 0.0) < (project.accuracy_target or 0.85):
            project.stage = Stage.patching
            db.commit()
            patch_mod.patch_for_misses(db, project, report.get("miss_clusters", {}))

        # 5. Package + open playground
        delivery_mod.package(db, project)
        project.playground_endpoint = f"/playground/{project.id}"
        project.stage = Stage.playground_ready
        emit(db, project.id, "pipeline", "playground ready — final 50% invoiced", level="success")
        db.commit()
    except Exception as e:
        log.exception("pipeline failed")
        emit(db, project.id, "pipeline", f"failure: {e}", level="error")
        project.stage = Stage.failed
        db.commit()
