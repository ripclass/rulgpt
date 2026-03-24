"""RuleGPT FastAPI application."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import SessionLocal
from app.exceptions import (
    AppError,
    app_error_handler,
    unhandled_exception_handler,
    validation_error_handler,
)
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.tier_check import TierCheckMiddleware
from app.routers import admin, api_access, billing, export, feedback, history, query, rules, saved, suggestions


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Fail fast on startup if DB is unavailable.
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
    finally:
        db.close()
    yield


app = FastAPI(
    title="RuleGPT API",
    description="Trade finance compliance conversational backend.",
    version="0.1.0",
    lifespan=lifespan,
)

# Middleware execution order in Starlette runs last-added first.
# Add rate limit first so tier extraction runs before it.
app.add_middleware(RateLimitMiddleware)
app.add_middleware(TierCheckMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

app.include_router(query.router)
app.include_router(suggestions.router)
app.include_router(rules.router)
app.include_router(history.router)
app.include_router(saved.router)
app.include_router(export.router)
app.include_router(api_access.router)
app.include_router(billing.router)
app.include_router(admin.router)
app.include_router(feedback.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "rulegpt-api"}
