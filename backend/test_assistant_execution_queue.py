from datetime import datetime, timedelta, timezone
import os
import tempfile

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, update
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.admin.auth import get_current_admin
from app.assistant.models import AssistantAction, AssistantAuditEvent, AssistantSession


def _client(file_backed=False):
    if file_backed:
        fd, db_path = tempfile.mkstemp(suffix=".sqlite3")
        os.close(fd)
        engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    else:
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
    db_path = engine.url.database
    engine.dispose()
    if db_path and db_path != ":memory:":
        try:
            os.unlink(db_path)
        except FileNotFoundError:
            pass


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
        assert duplicate.status_code == 200
        assert duplicate.json()["status"] == "completed"
        assert duplicate.json()["duplicate"] is True

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


def test_action_decision_is_single_winner_and_does_not_replace_command_credentials():
    client, engine, TestingSessionLocal = _client()
    try:
        registered = client.post("/api/assistant/devices", json={"name": "Approval race laptop"})
        assert registered.status_code == 201, registered.text
        device_id = registered.json()["device_id"]

        session = client.post(
            "/api/assistant/sessions",
            json={"input_mode": "text", "device_id": device_id},
        )
        assert session.status_code == 201, session.text
        session_id = session.json()["session_id"]

        proposal = client.post(
            f"/api/assistant/sessions/{session_id}/actions",
            json={"tool": "desktop.open_application", "arguments": {"app_id": "calculator"}},
        )
        assert proposal.status_code == 201, proposal.text
        action_id = proposal.json()["action_id"]

        first = client.post(
            f"/api/assistant/actions/{action_id}/decision",
            json={"decision": "approve"},
        )
        assert first.status_code == 200, first.text
        first_body = first.json()
        assert first_body["status"] == "approved"
        assert first_body["command_id"]

        # A second decision cannot overwrite the command ID or mint a new nonce.
        second = client.post(
            f"/api/assistant/actions/{action_id}/decision",
            json={"decision": "approve"},
        )
        assert second.status_code == 409

        db = TestingSessionLocal()
        try:
            action = db.query(AssistantAction).filter_by(id=action_id).one()
            assert action.status == "approved"
            assert action.command_id == first_body["command_id"]
            assert action.execution_nonce
            events = db.query(AssistantAuditEvent).filter_by(
                action_id=action_id,
                event_type="action.approved_and_queued",
            ).all()
            assert len(events) == 1
        finally:
            db.close()
    finally:
        client.close()
        _cleanup(engine)


def test_competing_stale_approvals_have_one_database_winner():
    """Two independent DB sessions that both read pending cannot both approve."""
    client, engine, TestingSessionLocal = _client(file_backed=True)
    try:
        registered = client.post("/api/assistant/devices", json={"name": "Concurrent approval laptop"})
        assert registered.status_code == 201, registered.text
        device_id = registered.json()["device_id"]
        session = client.post(
            "/api/assistant/sessions",
            json={"input_mode": "text", "device_id": device_id},
        )
        assert session.status_code == 201, session.text
        proposal = client.post(
            f"/api/assistant/sessions/{session.json()['session_id']}/actions",
            json={"tool": "desktop.open_application", "arguments": {"app_id": "calculator"}},
        )
        assert proposal.status_code == 201, proposal.text
        action_id = proposal.json()["action_id"]

        first_db = TestingSessionLocal()
        second_db = TestingSessionLocal()
        try:
            first_snapshot = first_db.query(AssistantAction).filter_by(id=action_id).one()
            second_snapshot = second_db.query(AssistantAction).filter_by(id=action_id).one()
            assert first_snapshot.status == second_snapshot.status == "awaiting_approval"

            first_command_id = "winner-command"
            first_nonce = "winner-nonce"
            first = first_db.execute(
                update(AssistantAction)
                .where(
                    AssistantAction.id == action_id,
                    AssistantAction.status == "awaiting_approval",
                )
                .values(
                    status="approved",
                    command_id=first_command_id,
                    execution_nonce=first_nonce,
                )
                .execution_options(synchronize_session=False)
            )
            assert first.rowcount == 1
            first_db.commit()

            # The second transaction acts on a stale read. The database predicate,
            # not the stale ORM object, must reject its attempted transition.
            second = second_db.execute(
                update(AssistantAction)
                .where(
                    AssistantAction.id == action_id,
                    AssistantAction.status == "awaiting_approval",
                )
                .values(
                    status="approved",
                    command_id="loser-command",
                    execution_nonce="loser-nonce",
                )
                .execution_options(synchronize_session=False)
            )
            assert second.rowcount == 0
            second_db.rollback()
        finally:
            first_db.close()
            second_db.close()

        verify_db = TestingSessionLocal()
        try:
            persisted = verify_db.query(AssistantAction).filter_by(id=action_id).one()
            assert persisted.status == "approved"
            assert persisted.command_id == "winner-command"
            assert persisted.execution_nonce == "winner-nonce"
        finally:
            verify_db.close()
    finally:
        client.close()
        _cleanup(engine)
