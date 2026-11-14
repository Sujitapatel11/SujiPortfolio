from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.admin.auth import get_current_admin
from app.assistant.models import AssistantAction, AssistantSession


def _client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_admin] = lambda: {"username": "owner-a", "role": "admin"}
    client = TestClient(app)
    return client, engine, TestingSessionLocal


def _cleanup(engine):
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_device_command_requires_bearer_token():
    client, engine, _ = _client()
    try:
        response = client.get("/api/assistant/device/commands/next")
        assert response.status_code == 401
    finally:
        client.close()
        _cleanup(engine)


def test_approved_command_is_claimed_once_and_result_is_one_time():
    client, engine, TestingSessionLocal = _client()
    try:
        registered = client.post("/api/assistant/devices", json={"name": "Windows laptop"})
        assert registered.status_code == 201, registered.text
        device_id = registered.json()["device_id"]
        token = registered.json()["device_token"]

        session = client.post("/api/assistant/sessions", json={"input_mode": "text", "device_id": device_id})
        assert session.status_code == 201, session.text
        session_id = session.json()["session_id"]

        proposal = client.post(
            f"/api/assistant/sessions/{session_id}/actions",
            json={"tool": "desktop.open_application", "arguments": {"app_id": "calculator"}},
        )
        assert proposal.status_code == 201, proposal.text
        action_id = proposal.json()["action_id"]

        decision = client.post(f"/api/assistant/actions/{action_id}/decision", json={"decision": "approve"})
        assert decision.status_code == 200, decision.text
        command_id = decision.json()["command_id"]
        assert decision.json()["status"] == "approved"

        headers = {"Authorization": f"Bearer {token}"}
        claimed = client.get("/api/assistant/device/commands/next", headers=headers)
        assert claimed.status_code == 200, claimed.text
        command = claimed.json()["command"]
        assert command["command_id"] == command_id
        assert command["tool"] == "desktop.open_application"
        assert command["arguments"] == {"app_id": "calculator"}

        # The same approved command cannot be claimed a second time.
        again = client.get("/api/assistant/device/commands/next", headers=headers)
        assert again.status_code == 200
        assert again.json()["command"] is None

        result_payload = {
            "command_id": command_id,
            "payload_sha256": command["payload_sha256"],
            "nonce": command["nonce"],
            "outcome": "completed",
            "result_code": "opened",
            "message": "Calculator launch requested",
        }
        result = client.post(
            f"/api/assistant/device/commands/{command_id}/result",
            json=result_payload,
            headers=headers,
        )
        assert result.status_code == 200, result.text
        assert result.json()["status"] == "completed"

        duplicate = client.post(
            f"/api/assistant/device/commands/{command_id}/result",
            json=result_payload,
            headers=headers,
        )
        assert duplicate.status_code == 409

        db = TestingSessionLocal()
        try:
            action = db.query(AssistantAction).filter_by(id=action_id).one()
            assert action.status == "completed"
            assert action.completed_at is not None
        finally:
            db.close()
    finally:
        client.close()
        _cleanup(engine)


def test_revoked_device_cannot_claim_commands():
    client, engine, _ = _client()
    try:
        registered = client.post("/api/assistant/devices", json={"name": "Test laptop"})
        device_id = registered.json()["device_id"]
        token = registered.json()["device_token"]
        revoked = client.post(f"/api/assistant/devices/{device_id}/revoke")
        assert revoked.status_code == 200
        response = client.get(
            "/api/assistant/device/commands/next",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 401
    finally:
        client.close()
        _cleanup(engine)


def test_device_cannot_submit_result_for_other_device():
    client, engine, _ = _client()
    try:
        a = client.post("/api/assistant/devices", json={"name": "Laptop A"}).json()
        b = client.post("/api/assistant/devices", json={"name": "Laptop B"}).json()
        session = client.post("/api/assistant/sessions", json={"input_mode": "text", "device_id": a["device_id"]}).json()
        proposal = client.post(
            f"/api/assistant/sessions/{session['session_id']}/actions",
            json={"tool": "desktop.open_application", "arguments": {"app_id": "calculator"}},
        ).json()
        decision = client.post(
            f"/api/assistant/actions/{proposal['action_id']}/decision",
            json={"decision": "approve"},
        ).json()
        command = client.get(
            "/api/assistant/device/commands/next",
            headers={"Authorization": f"Bearer {a['device_token']}"},
        ).json()["command"]
        payload = {
            "command_id": decision["command_id"],
            "payload_sha256": command["payload_sha256"],
            "nonce": command["nonce"],
            "outcome": "completed",
            "result_code": "opened",
            "message": "done",
        }
        wrong_device = client.post(
            f"/api/assistant/device/commands/{decision['command_id']}/result",
            json=payload,
            headers={"Authorization": f"Bearer {b['device_token']}"},
        )
        assert wrong_device.status_code == 404
    finally:
        client.close()
        _cleanup(engine)
