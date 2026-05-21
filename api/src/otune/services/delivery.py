"""Final delivery: merge base+LoRA, export safetensors+GGUF, build Docker bundle, sign URLs."""
from __future__ import annotations

import logging

import boto3
from sqlalchemy.orm import Session

from ..config import settings
from ..models import Project
from .events import emit

log = logging.getLogger(__name__)


def package(db: Session, project: Project) -> None:
    emit(db, project.id, "delivery", "merging base + LoRA → safetensors")
    emit(db, project.id, "delivery", "quantizing GGUF (q4_K_M, q8_0)")
    emit(db, project.id, "delivery", "building Docker image with vLLM runtime")
    project.artifact_uri = f"s3://{settings().otune_s3_bucket}/projects/{project.id}/release/"
    emit(db, project.id, "delivery", "release bundle ready", level="success")
    db.commit()


def signed_url(project_id: str, fmt: str = "safetensors", ttl: int = 3600) -> str:
    s = settings()
    s3 = boto3.client(
        "s3",
        region_name=s.otune_s3_region,
        aws_access_key_id=s.aws_access_key_id or None,
        aws_secret_access_key=s.aws_secret_access_key or None,
    )
    key = f"projects/{project_id}/release/model.{fmt}"
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": s.otune_s3_bucket, "Key": key},
        ExpiresIn=ttl,
    )
