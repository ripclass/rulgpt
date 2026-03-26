"""Telemetry schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field


class TelemetryEventRequest(BaseModel):
    event: str = Field(min_length=1, max_length=120)
    payload: dict[str, object] = Field(default_factory=dict)
    path: str | None = None
    source: str = "web"
    occurred_at: str | None = None


class FrontendErrorRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    stack: str | None = None
    path: str | None = None
    source: str = "web"
    occurred_at: str | None = None
    metadata: dict[str, object] = Field(default_factory=dict)


class TelemetryAcceptedResponse(BaseModel):
    accepted: bool = True
