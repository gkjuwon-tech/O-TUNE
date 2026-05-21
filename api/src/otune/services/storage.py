"""Storage abstraction. Dev → local FS under OTUNE_DATA_DIR. Prod → S3."""
from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

from ..config import settings


def _root() -> Path:
    p = Path(settings().otune_data_dir)
    p.mkdir(parents=True, exist_ok=True)
    return p


def project_dir(project_id: str) -> Path:
    p = _root() / "projects" / project_id
    p.mkdir(parents=True, exist_ok=True)
    return p


def write_text(project_id: str, name: str, content: str) -> Path:
    f = project_dir(project_id) / name
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(content, encoding="utf-8")
    return f


def write_json(project_id: str, name: str, obj: Any) -> Path:
    return write_text(project_id, name, json.dumps(obj, indent=2, ensure_ascii=False))


def append_jsonl(project_id: str, name: str, row: dict) -> None:
    f = project_dir(project_id) / name
    f.parent.mkdir(parents=True, exist_ok=True)
    with f.open("a", encoding="utf-8") as fp:
        fp.write(json.dumps(row, ensure_ascii=False) + "\n")


def read_jsonl(project_id: str, name: str) -> list[dict]:
    f = project_dir(project_id) / name
    if not f.exists():
        return []
    return [json.loads(l) for l in f.read_text(encoding="utf-8").splitlines() if l.strip()]


def model_dir(project_id: str) -> Path:
    p = project_dir(project_id) / "model"
    p.mkdir(parents=True, exist_ok=True)
    return p


def cleanup_project(project_id: str) -> None:
    p = project_dir(project_id)
    if p.exists():
        shutil.rmtree(p)
