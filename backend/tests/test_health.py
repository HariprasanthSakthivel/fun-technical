"""Basic tests for the health-check endpoint."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check_returns_ok() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["success"] is True
    assert "service" in data
    assert "environment" in data


def test_root_returns_links() -> None:
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["health"] == "/api/health"
    assert data["docs"] == "/docs"
