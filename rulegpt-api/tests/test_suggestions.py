from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_suggestions_returns_seed_prompts():
    response = client.get("/api/suggestions")
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 5
    # Seed list includes UCP-related prompts; order isn't fixed.
    joined = " ".join(item["text"] for item in items)
    assert "UCP" in joined

