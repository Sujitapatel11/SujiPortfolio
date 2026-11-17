from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.admin.auth import get_current_admin
from app.database import Base, get_db
from app.main import app
from app.assistant import models as assistant_models  # noqa: F401


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    identity = {"username": "owner", "role": "admin"}

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    def override_current_admin():
        return identity

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_admin] = override_current_admin
    with TestClient(app) as test_client:
        test_client.identity_for_test = identity
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_assistant_session_endpoint_requires_authentication():
    response = TestClient(app).post("/api/assistant/sessions", json={"input_mode": "text"})
    assert response.status_code in (401, 403)


def test_owner_can_create_and_read_session(client):
    created = client.post("/api/assistant/sessions", json={"input_mode": "text"})
    assert created.status_code == 201, created.text
    session_id = created.json()["session_id"]

    read = client.get(f"/api/assistant/sessions/{session_id}")
    assert read.status_code == 200
    assert read.json()["session_id"] == session_id


def test_different_owner_cannot_read_session(client):
    created = client.post("/api/assistant/sessions", json={"input_mode": "text"})
    session_id = created.json()["session_id"]

    client.identity_for_test["username"] = "different-user"
    read = client.get(f"/api/assistant/sessions/{session_id}")
    assert read.status_code == 404


def test_different_owner_cannot_approve_action(client):
    created = client.post("/api/assistant/sessions", json={"input_mode": "text"})
    session_id = created.json()["session_id"]
    proposal = client.post(
        f"/api/assistant/sessions/{session_id}/actions",
        json={
            "tool": "desktop.open_application",
            "arguments": {"app_id": "calculator"},
        },
    )
    assert proposal.status_code == 201, proposal.text
    action_id = proposal.json()["action_id"]

    client.identity_for_test["username"] = "different-user"
    denied = client.post(
        f"/api/assistant/actions/{action_id}/decision",
        json={"decision": "approve"},
    )
    assert denied.status_code == 404


def test_owner_can_approve_but_approval_does_not_execute(client):
    # Approval is permitted only for a session bound to an active paired device.
    registered = client.post("/api/assistant/devices", json={"name": "Test laptop"})
    assert registered.status_code == 201, registered.text
    device_id = registered.json()["device_id"]

    created = client.post(
        "/api/assistant/sessions",
        json={"input_mode": "text", "device_id": device_id},
    )
    assert created.status_code == 201, created.text
    session_id = created.json()["session_id"]
    proposal = client.post(
        f"/api/assistant/sessions/{session_id}/actions",
        json={
            "tool": "desktop.open_application",
            "arguments": {"app_id": "calculator"},
        },
    )
    assert proposal.status_code == 201, proposal.text
    action_id = proposal.json()["action_id"]

    approved = client.post(
        f"/api/assistant/actions/{action_id}/decision",
        json={"decision": "approve"},
    )
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "approved"
    assert approved.json()["command_id"]

    actions = client.get(f"/api/assistant/sessions/{session_id}/actions")
    assert actions.status_code == 200
    action = next(item for item in actions.json() if item["action_id"] == action_id)
    assert action["status"] == "approved"
    assert action["status"] != "completed"
