"""Persistence models for assistant sessions, messages, actions and audit events."""
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text, Index, Boolean
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
    workflows = relationship("AssistantWorkflow", back_populates="session", cascade="all, delete-orphan")


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
    approved_by = Column(String(255), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    rejected_reason = Column(Text, nullable=True)
    result = Column(JSON, nullable=True)
    error_code = Column(String(100), nullable=True)
    target_device_id = Column(String(36), ForeignKey("assistant_devices.id", ondelete="SET NULL"), nullable=True, index=True)
    command_id = Column(String(36), nullable=True, unique=True)
    execution_nonce = Column(String(64), nullable=True, unique=True)
    claimed_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

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


class AssistantDevice(Base):
    __tablename__ = "assistant_devices"

    id = Column(String(36), primary_key=True)
    owner_username = Column(String(255), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    token_sha256 = Column(String(64), nullable=False, unique=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)


class AssistantWorkflow(Base):
    __tablename__ = "assistant_workflows"
    __table_args__ = (
        Index("ix_assistant_workflows_session_status", "session_id", "status"),
    )

    id = Column(String(36), primary_key=True)
    session_id = Column(String(36), ForeignKey("assistant_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    owner_username = Column(String(255), nullable=False, index=True)
    device_id = Column(String(36), ForeignKey("assistant_devices.id", ondelete="SET NULL"), nullable=True, index=True)
    goal = Column(Text, nullable=False)
    allowed_domains = Column(JSON, nullable=False, default=list)
    status = Column(String(32), nullable=False, default="queued", index=True)
    current_step_index = Column(Integer, nullable=False, default=0)
    total_steps = Column(Integer, nullable=False, default=0)
    context_data = Column(JSON, nullable=False, default=dict)
    waiting_reason = Column(Text, nullable=True)
    evidence = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    session = relationship("AssistantSession", back_populates="workflows")
    steps = relationship("AssistantWorkflowStep", back_populates="workflow", cascade="all, delete-orphan", order_by="AssistantWorkflowStep.step_index")
    events = relationship("WorkflowExecutionEvent", back_populates="workflow", cascade="all, delete-orphan", order_by="WorkflowExecutionEvent.created_at")


class AssistantWorkflowStep(Base):
    __tablename__ = "assistant_workflow_steps"
    __table_args__ = (
        Index("ix_assistant_workflow_steps_workflow_status", "workflow_id", "status"),
    )

    id = Column(String(36), primary_key=True)
    workflow_id = Column(String(36), ForeignKey("assistant_workflows.id", ondelete="CASCADE"), nullable=False, index=True)
    step_index = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    tool = Column(String(100), nullable=False)
    arguments = Column(JSON, nullable=False, default=dict)
    status = Column(String(32), nullable=False, default="pending", index=True)
    requires_approval = Column(Boolean, nullable=False, default=False)
    action_id = Column(String(36), ForeignKey("assistant_actions.id", ondelete="SET NULL"), nullable=True, index=True)
    result = Column(JSON, nullable=True)
    evidence_url = Column(String(500), nullable=True)
    evidence_screenshot = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    workflow = relationship("AssistantWorkflow", back_populates="steps")


class WorkflowExecutionEvent(Base):
    __tablename__ = "workflow_execution_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workflow_id = Column(String(36), ForeignKey("assistant_workflows.id", ondelete="CASCADE"), nullable=False, index=True)
    step_id = Column(String(36), ForeignKey("assistant_workflow_steps.id", ondelete="SET NULL"), nullable=True, index=True)
    event_type = Column(String(64), nullable=False, index=True)
    message = Column(Text, nullable=False)
    payload = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    workflow = relationship("AssistantWorkflow", back_populates="events")


class AssistantWorkProfile(Base):
    __tablename__ = "assistant_work_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    owner_username = Column(String(255), nullable=False, unique=True, index=True)
    headline = Column(String(255), nullable=False)
    bio = Column(Text, nullable=False)
    skills = Column(JSON, nullable=False, default=list)
    programming_languages = Column(JSON, nullable=False, default=list)
    frameworks = Column(JSON, nullable=False, default=list)
    projects = Column(JSON, nullable=False, default=list)
    portfolio_links = Column(JSON, nullable=False, default=list)
    github_url = Column(String(255), nullable=True)
    linkedin_url = Column(String(255), nullable=True)
    education = Column(JSON, nullable=False, default=list)
    work_experience = Column(JSON, nullable=False, default=list)
    preferred_job_categories = Column(JSON, nullable=False, default=list)
    minimum_budget = Column(String(50), nullable=True)
    availability = Column(String(100), nullable=True)
    languages = Column(JSON, nullable=False, default=list)
    excluded_job_categories = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)
