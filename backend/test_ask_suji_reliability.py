"""Focused regression tests for Ask Suji reliability and session boundaries."""
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import Appointment, ChatConversation, ChatMessage, Inquiry, KnowledgeChunk
from app.agent import agent as agent_module
from app.agent import retrieval as retrieval_module
from app.agent.agent import ConversationAccessError, run_agent_message


@pytest.fixture()
def test_context(monkeypatch):
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
    monkeypatch.setattr(agent_module, "get_llm", lambda: None)
    with TestClient(app) as client:
        yield client, TestingSessionLocal
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_provider_outage_never_fabricates_budget_or_appointment_time(test_context):
    client, factory = test_context
    response = client.post(
        "/api/chat",
        json={"message": "I want a project. My name is Alex and my email is alex@example.com."},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "degraded"
    assert "$5,000" not in data["reply"]
    assert "Tomorrow afternoon" not in data["reply"]
    assert "not generated an AI answer" in data["reply"]
    db = factory()
    try:
        assert db.query(Inquiry).count() == 0
        assert db.query(Appointment).count() == 0
        conversation = db.query(ChatConversation).filter_by(id=data["conversation_id"]).one()
        messages = db.query(ChatMessage).filter_by(conversation_id=conversation.id).order_by(ChatMessage.id).all()
        assert [message.role for message in messages] == ["user", "assistant"]
    finally:
        db.close()


def test_conversation_survives_new_database_session_and_is_role_scoped(test_context):
    client, factory = test_context
    response = client.post("/api/chat", json={"message": "Remember this session."})
    assert response.status_code == 200
    conversation_id = response.json()["conversation_id"]

    # A fresh SQLAlchemy session represents a process/request restart.
    db = factory()
    try:
        history = client.get(f"/api/chat/{conversation_id}/messages")
        assert history.status_code == 200
        assert history.json()[0]["text"] == "Remember this session."

        _, owner_id, _, _ = run_agent_message(
            "Private owner context", db=db, is_admin_context=True, owner_username="owner-a"
        )
        assert owner_id != conversation_id
        with pytest.raises(ConversationAccessError):
            run_agent_message(
                "Try to reuse owner history", conversation_id=owner_id, db=db,
                is_admin_context=False,
            )
        with pytest.raises(ConversationAccessError):
            run_agent_message(
                "Other owner", conversation_id=owner_id, db=db,
                is_admin_context=True, owner_username="owner-b",
            )
    finally:
        db.close()


def test_expired_conversation_is_rejected(test_context):
    client, factory = test_context
    response = client.post("/api/chat", json={"message": "hello"})
    conversation_id = response.json()["conversation_id"]
    db = factory()
    try:
        item = db.query(ChatConversation).filter_by(id=conversation_id).one()
        item.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.commit()
    finally:
        db.close()
    history = client.get(f"/api/chat/{conversation_id}/messages")
    assert history.status_code == 410


def test_appointment_request_is_pending_time_optional_and_idempotent(test_context, monkeypatch):
    client, factory = test_context
    monkeypatch.setattr("app.routes.appointments.send_whatsapp_notification", lambda message: False)
    response = client.post(
        "/api/appointments",
        json={"name": "Alex Visitor", "email": "alex@example.com", "purpose": "Discuss an MVP"},
        headers={"Idempotency-Key": "test-appointment-request-0001"},
    )
    assert response.status_code == 201, response.text
    data = response.json()
    duplicate = client.post(
        "/api/appointments",
        json={"name": "Alex Visitor", "email": "alex@example.com", "purpose": "Discuss an MVP"},
        headers={"Idempotency-Key": "test-appointment-request-0001"},
    )
    assert duplicate.status_code == 201
    assert duplicate.json()["id"] == data["id"]
    assert duplicate.json()["duplicate"] is True
    assert data["status"] == "pending"
    assert data["preferred_time"] is None
    assert data["owner_notification_sent"] is False
    assert "notified" not in data["message"].lower()
    db = factory()
    try:
        appointment = db.query(Appointment).filter_by(id=data["id"]).one()
        assert appointment.preferred_time is None
        assert db.query(Appointment).count() == 1
    finally:
        db.close()


def test_public_rag_hides_private_namespaces_and_rejects_irrelevant_chunks(test_context, monkeypatch):
    _, factory = test_context
    query_vector = [1.0] + [0.0] * 383
    monkeypatch.setattr(retrieval_module, "generate_embedding", lambda query: query_vector)
    db = factory()
    try:
        db.add_all([
            KnowledgeChunk(source="profile:skills", content="Public skill facts", embedding=query_vector),
            KnowledgeChunk(source="admin:private", content="Private owner notes", embedding=query_vector),
            KnowledgeChunk(source="profile:unrelated", content="Irrelevant fact", embedding=[0.0, 1.0] + [0.0] * 382),
        ])
        db.commit()
        public_chunks = retrieval_module.retrieve_relevant_chunks("skills question", db=db, is_admin_context=False)
        assert [chunk.source for chunk in public_chunks] == ["profile:skills"]
        no_match = retrieval_module.retrieve_relevant_chunks(
            "unrelated question", db=db, is_admin_context=False, min_similarity=0.95
        )
        assert no_match == []
    finally:
        db.close()
