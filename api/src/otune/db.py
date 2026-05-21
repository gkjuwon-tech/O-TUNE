from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings


class Base(DeclarativeBase):
    pass


_engine = None
_SessionLocal = None


def engine():
    global _engine, _SessionLocal
    if _engine is None:
        _engine = create_engine(settings().otune_database_url, pool_pre_ping=True, future=True)
        _SessionLocal = sessionmaker(bind=_engine, expire_on_commit=False, autoflush=False)
    return _engine


def session_factory():
    engine()
    return _SessionLocal  # type: ignore[return-value]


@contextmanager
def get_session() -> Iterator[Session]:
    SessionLocal = session_factory()
    s = SessionLocal()
    try:
        yield s
        s.commit()
    except Exception:
        s.rollback()
        raise
    finally:
        s.close()


def init_db() -> None:
    from . import models  # noqa: F401  ensure model registration
    Base.metadata.create_all(bind=engine())
