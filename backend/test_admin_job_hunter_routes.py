"""Focused API contract tests for the authenticated Job Hunter admin routes."""
import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.admin.auth import ADMIN_USERNAME, create_access_token
from app.database import Base, get_db
from app.main import app


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def admin_headers():
    token = create_access_token(data={"sub": ADMIN_USERNAME, "role": "admin"})
    return {"Authorization": f"Bearer {token}"}


def test_job_hunter_routes_require_admin_authentication(client):
    paths = [
        ("GET", "/admin/jobs"),
        ("GET", "/admin/proposals"),
        ("POST", "/admin/jobs/paste"),
        ("PATCH", "/admin/proposals/1"),
        ("PATCH", "/admin/jobs/1/status"),
        ("POST", "/admin/jobs/search-now"),
        ("GET", "/admin/jobs/agent/status"),
        ("POST", "/admin/jobs/agent/start"),
        ("POST", "/admin/jobs/agent/stop"),
    ]
    for method, path in paths:
        response = client.request(method, path, json={} if method in {"POST", "PATCH"} else None)
        assert response.status_code == 401, f"{method} {path} should require admin auth"


def test_manual_job_proposal_edit_and_status_flow(client, admin_headers):
    pasted = client.post(
        "/admin/jobs/paste",
        headers=admin_headers,
        json={
            "platform": "Manual Test",
            "title": "Python FastAPI backend engineer",
            "description": "Build a FastAPI backend with PostgreSQL and automated tests.",
            "url": "https://example.com/jobs/fastapi",
            "budget": "USD 1000",
        },
    )
    assert pasted.status_code == 201, pasted.text
    payload = pasted.json()
    job = payload["job"]
    proposal = payload["proposal"]
    assert job["id"] > 0
    assert proposal["job_id"] == job["id"]
    assert "Python FastAPI backend engineer" in proposal["draft_text"]

    edited_text = "A reviewed proposal draft."
    edited = client.patch(
        f"/admin/proposals/{proposal['id']}",
        headers=admin_headers,
        json={"edited_text": edited_text},
    )
    assert edited.status_code == 200, edited.text
    assert edited.json()["edited_text"] == edited_text

    updated = client.patch(
        f"/admin/jobs/{job['id']}/status",
        headers=admin_headers,
        json={"status": "applied"},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["status"] == "applied"

    proposals = client.get("/admin/proposals", headers=admin_headers)
    assert proposals.status_code == 200
    linked = next(item for item in proposals.json() if item["id"] == proposal["id"])
    assert linked["status"] == "submitted"

    jobs = client.get("/admin/jobs", headers=admin_headers)
    assert jobs.status_code == 200
    assert any(item["id"] == job["id"] for item in jobs.json())


def test_job_status_rejects_unknown_values_and_missing_ids(client, admin_headers):
    invalid = client.patch(
        "/admin/jobs/999/status",
        headers=admin_headers,
        json={"status": "delete-everything"},
    )
    assert invalid.status_code == 422

    missing = client.patch(
        "/admin/jobs/999/status",
        headers=admin_headers,
        json={"status": "applied"},
    )
    assert missing.status_code == 404


def test_proposal_update_rejects_empty_payload_and_missing_id(client, admin_headers):
    empty = client.patch("/admin/proposals/1", headers=admin_headers, json={})
    assert empty.status_code == 422

    missing = client.patch(
        "/admin/proposals/999",
        headers=admin_headers,
        json={"edited_text": "Updated"},
    )
    assert missing.status_code == 404


def test_search_now_uses_discovery_service_and_returns_summary(client, admin_headers, monkeypatch):
    expected = {"Test Provider": {"fetched": 3, "matched": 1, "drafted": 1}}

    class Discovery:
        def run_discovery(self, db, keywords):
            assert keywords == ["python", "fastapi"]
            return expected

    monkeypatch.setattr("app.admin.orchestrator.JobDiscoveryOrchestrator", Discovery)
    response = client.post(
        "/admin/jobs/search-now",
        headers=admin_headers,
        json={"keywords": [" python ", "fastapi"]},
    )
    assert response.status_code == 200, response.text
    assert response.json() == {"summary": expected}


def test_search_now_rejects_empty_keywords(client, admin_headers):
    response = client.post(
        "/admin/jobs/search-now",
        headers=admin_headers,
        json={"keywords": [" ", ""]},
    )
    assert response.status_code == 422


def test_scheduler_controls_delegate_to_scheduler_service(client, admin_headers, monkeypatch):
    calls = []
    status = {"enabled": True, "configured": False, "interval_hours": 6}

    monkeypatch.setattr(
        "app.admin.job_scheduler.start_scheduler",
        lambda force=False: calls.append(("start", force)),
    )
    monkeypatch.setattr(
        "app.admin.job_scheduler.stop_scheduler",
        lambda: calls.append(("stop",)),
    )
    monkeypatch.setattr(
        "app.admin.job_scheduler.scheduler_status",
        lambda: status,
    )

    started = client.post("/admin/jobs/agent/start", headers=admin_headers)
    stopped = client.post("/admin/jobs/agent/stop", headers=admin_headers)
    current = client.get("/admin/jobs/agent/status", headers=admin_headers)

    assert started.status_code == 200
    assert stopped.status_code == 200
    assert current.status_code == 200
    assert started.json() == status
    assert stopped.json() == status
    assert current.json() == status
    assert calls == [("start", True), ("stop",)]
