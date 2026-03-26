from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers import telemetry


def _build_app() -> FastAPI:
    app = FastAPI()
    app.include_router(telemetry.router)
    return app


def test_telemetry_event_endpoint_accepts_payload():
    client = TestClient(_build_app())

    response = client.post(
        "/api/telemetry/events",
        json={
            "event": "landing_open_chat_clicked",
            "path": "/",
            "source": "web",
            "payload": {"surface": "hero"},
        },
    )

    assert response.status_code == 202
    assert response.json() == {"accepted": True}


def test_telemetry_error_endpoint_accepts_payload():
    client = TestClient(_build_app())

    response = client.post(
        "/api/telemetry/frontend-errors",
        json={
            "message": "Example error",
            "stack": "stack trace",
            "path": "/chat",
            "metadata": {"component": "QueryInput"},
        },
    )

    assert response.status_code == 202
    assert response.json() == {"accepted": True}
