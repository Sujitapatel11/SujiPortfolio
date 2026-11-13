"""Persistence models for assistant sessions, messages, actions and audit events."""
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text, Index
from sqlalchemy.orm import relationship

from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class AssistantSession(Base):
    __tablename__ = "assistant_sessions"

    id = Column(String(36), primary_key=True)
    owner_username = Column(String(255), nullable=False, index=True)
    device_id = Column(String(128), nullable=True)
    status = Column(String(32), nullable=False, default="active", index=True)
    input_mode = Column(String(16), nullable=False, default="voice")
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    messages = relationship("AssistantMessage", back_populates="session", cascade="all, delete-orphan")
    actions = relationship("AssistantAction", back_populates="session", cascade="all, delete-orphan")


class AssistantMessage(Base):
    __tablename__ = "assistant_messages"

    id = Column(String(36), primary_key=True)
    session_id = Column(String(36), ForeignKey("assistant_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(16), nullable=False)
    input_mode = Column(String(16), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    session = relationship("AssistantSession", back_populates="messages")


class AssistantAction(Base):
    __tablename__ = "assistant_actions"
    __table_args__ = (
        Index("ix_assistant_actions_session_status", "session_id", "status"),
    )

    id = Column(String(36), primary_key=True)
    session_id = Column(String(36), ForeignKey("assistant_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    tool = Column(String(100), nullable=False)
    arguments = Column(JSON, nullable=False)
    summary = Column(String(500), nullable=False)
    risk = Column(String(16), nullable=False)
    payload_sha256 = Column(String(64), nullable=False)
    status = Column(String(32), nullable=False, default="awaiting_approval", index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    session = relationship("AssistantSession", back_populates="actions")


class AssistantAuditEvent(Base):
    __tablename__ = "assistant_audit_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(36), ForeignKey("assistant_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    action_id = Column(String(36), ForeignKey("assistant_actions.id", ondelete="SET NULL"), nullable=True, index=True)
    actor = Column(String(255), nullable=False)
    event_type = Column(String(64), nullable=False, index=True)
    details = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
