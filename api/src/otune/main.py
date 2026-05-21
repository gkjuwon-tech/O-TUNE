from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import init_db
from .routers import projects, stripe_webhook

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s :: %(message)s")
log = logging.getLogger("otune")


def create_app() -> FastAPI:
    app = FastAPI(
        title="O'TUNE API",
        version="0.1.0",
        description="Orchestrates benchmark → dataset → train → eval → deliver.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings().otune_frontend_url, "http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def _startup():
        try:
            init_db()
            log.info("DB initialized at %s", settings().otune_database_url)
        except Exception as e:
            log.warning("DB init failed (continuing — useful for local dev without postgres): %s", e)

    @app.get("/healthz")
    def healthz():
        return {"ok": True, "env": settings().otune_env}

    app.include_router(projects.router)
    app.include_router(stripe_webhook.router)
    return app


app = create_app()
