import os
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.admin.auth import get_current_admin
from app.assistant.models import AssistantSession, AssistantMessage, AssistantAction, AssistantAuditEvent


@pytest.fixture()
def test_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
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

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_assistant_sessions_require_authentication():
    # Remove the authenticated-user override: the real HTTP bearer dependency applies.
    app.dependency_overrides.pop(get_current_admin, None)
    response = TestClient(app).post("/api/assistant/sessions", json={"input_mode": "text"})
    assert response.status_code == 401


def test_owner_can_create_and_read_own_session(test_client):
    created = test_client.post("/api/assistant/sessions", json={"input_mode": "text"})
    assert created.status_code == 201, created.text
    session_id = created.json()["session_id"]

    fetched = test_client.get(f"/api/assistant/sessions/{session_id}")
    assert fetched.status_code == 200
    assert fetched.json()["session_id"] == session_id
    assert fetched.json()["status"] == "active"


def test_other_owner_cannot_read_session(test_client):
    created = test_client.post("/api/assistant/sessions", json={"input_mode": "text"})
    assert created.status_code == 201
    session_id = created.json()["session_id"]

    app.dependency_overrides[get_current_admin] = lambda: {"username": "owner-b", "role": "admin"}
    response = test_client.get(f"/api/assistant/sessions/{session_id}")
    assert response.status_code == 404


def test_expired_session_is_rejected(test_client):
    created = test_client.post("/api/assistant/sessions", json={"input_mode": "text"})
    assert created.status_code == 201
    session_id = created.json()["session_id"]

    from app.database import SessionLocal
    # Use the active test DB through the dependency override rather than the global session.
    override = app.dependency_overrides[get_db]
    db = next(override())
    try:
        item = db.query(AssistantSession).filter_by(id=session_id).first()
        item.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        db.commit()
    finally:
        db.close()

    response = test_client.get(f"/api/assistant/sessions/{session_id}")
    assert response.status_code == 410
