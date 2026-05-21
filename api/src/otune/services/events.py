from __future__ import annotations
from sqlalchemy.orm import Session
from ..models import Event, new_id


def emit(db: Session, project_id: str, stage: str, message: str, level: str = "info") -> Event:
    e = Event(id=new_id(), project_id=project_id, stage=stage, level=level, message=message)
    db.add(e)
    db.flush()
    return e
