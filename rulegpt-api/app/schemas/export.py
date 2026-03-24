"""Export schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ExportPayloadResponse(BaseModel):
    query_id: UUID
    exported_at: datetime
    format: str
    payload: dict


class SessionExportPayloadResponse(BaseModel):
    session_id: UUID
    exported_at: datetime
    format: str
    payload: dict

