"""Lightweight telemetry routes for frontend analytics and error intake."""

from __future__ import annotations

import logging

from fastapi import APIRouter

from app.schemas.telemetry import (
    FrontendErrorRequest,
    TelemetryAcceptedResponse,
    TelemetryEventRequest,
)

router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])
logger = logging.getLogger("rulegpt.telemetry")


@router.post("/events", response_model=TelemetryAcceptedResponse, status_code=202)
async def capture_event(payload: TelemetryEventRequest) -> TelemetryAcceptedResponse:
    logger.info(
        "frontend_event",
        extra={
            "event": payload.event,
            "path": payload.path,
            "source": payload.source,
            "occurred_at": payload.occurred_at,
            "payload": payload.payload,
        },
    )
    return TelemetryAcceptedResponse()


@router.post("/frontend-errors", response_model=TelemetryAcceptedResponse, status_code=202)
async def capture_frontend_error(payload: FrontendErrorRequest) -> TelemetryAcceptedResponse:
    logger.error(
        "frontend_error",
        extra={
            "error_message": payload.message,
            "stack": payload.stack,
            "path": payload.path,
            "source": payload.source,
            "occurred_at": payload.occurred_at,
            "metadata": payload.metadata,
        },
    )
    return TelemetryAcceptedResponse()
