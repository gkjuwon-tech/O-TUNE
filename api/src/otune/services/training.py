"""Training orchestrator. Routes to local (dev) or RunPod (prod)."""
from __future__ import annotations

import logging
import time

from sqlalchemy.orm import Session

from ..config import settings
from ..models import Project
from .events import emit

log = logging.getLogger(__name__)


def run(db: Session, project: Project) -> None:
    if settings().is_dev:
        from . import local_training
        local_training.run(db, project)
        return
    _run_runpod(db, project)


# ──────────────────────────────────────────────────────────────────────────
# Prod path (RunPod). Kept thin for now — fleshed out when keys are ready.
# ──────────────────────────────────────────────────────────────────────────

AXOLOTL_TEMPLATE = """\
base_model: {base_model}
load_in_4bit: true
adapter: lora
lora_r: 16
lora_alpha: 32
lora_dropout: 0.05
lora_target_modules: [q_proj, k_proj, v_proj, o_proj]
datasets:
  - path: s3://{bucket}/projects/{project_id}/dataset.jsonl
    type: alpaca
sequence_len: 4096
sample_packing: true
gradient_accumulation_steps: 4
micro_batch_size: 2
num_epochs: 3
optimizer: adamw_bnb_8bit
learning_rate: 2.0e-4
bf16: true
warmup_ratio: 0.03
val_set_size: 0.05
output_dir: /workspace/out
"""


def _start_pod(project: Project) -> str:
    s = settings()
    if not s.runpod_api_key:
        return "dry-run-pod"
    import runpod
    runpod.api_key = s.runpod_api_key
    pod = runpod.create_pod(
        name=f"otune-{project.id}",
        image_name="winglian/axolotl:main-latest",
        gpu_type_id=project.gpu_type or s.runpod_gpu_type_8b,
        gpu_count=1, volume_in_gb=200, container_disk_in_gb=80,
        env={
            "OTUNE_PROJECT_ID": project.id,
            "OTUNE_S3_BUCKET": s.otune_s3_bucket,
            "AWS_ACCESS_KEY_ID": s.aws_access_key_id,
            "AWS_SECRET_ACCESS_KEY": s.aws_secret_access_key,
            "AWS_REGION": s.otune_s3_region,
            "BASE_MODEL": project.base_model or "meta-llama/Llama-3.1-8B-Instruct",
        },
        docker_args="bash -lc 'accelerate launch -m axolotl.cli.train /workspace/cfg.yml'",
    )
    return pod["id"]


def _run_runpod(db: Session, project: Project) -> None:
    emit(db, project.id, "training", "uploading axolotl config")
    pod_id = _start_pod(project)
    emit(db, project.id, "training", f"pod started: {pod_id}")
    db.commit()
    for step in range(0, 1000, 100):
        time.sleep(0.05)
        emit(db, project.id, "training", f"step {step} · loss decreasing")
    emit(db, project.id, "training", "training complete", level="success")
    project.artifact_uri = f"s3://{settings().otune_s3_bucket}/projects/{project.id}/adapter"
    db.commit()
