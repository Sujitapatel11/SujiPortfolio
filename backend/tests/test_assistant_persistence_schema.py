from app.database import Base
from app.assistant.models import AssistantAction, AssistantAuditEvent, AssistantMessage, AssistantSession


def test_assistant_tables_are_registered():
    assert {
        "assistant_sessions",
        "assistant_messages",
        "assistant_actions",
        "assistant_audit_events",
    }.issubset(Base.metadata.tables)


def test_action_model_persists_approval_and_expiry_fields():
    columns = AssistantAction.__table__.columns
    for name in ("payload_sha256", "status", "expires_at", "approved_by", "approved_at", "rejected_reason"):
        assert name in columns


def test_audit_events_are_linked_to_sessions_and_actions():
    columns = AssistantAuditEvent.__table__.columns
    assert "session_id" in columns
    assert "action_id" in columns
    assert "event_type" in columns
    assert "details" in columns


def test_messages_are_session_scoped():
    assert "session_id" in AssistantMessage.__table__.columns
    assert "content" in AssistantMessage.__table__.columns
    assert "owner_username" in AssistantSession.__table__.columns
