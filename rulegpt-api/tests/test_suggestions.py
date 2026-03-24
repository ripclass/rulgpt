from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_suggestions_returns_seed_prompts():
    response = client.get("/api/suggestions")
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 5
    assert "UCP600" in items[0]["text"]

