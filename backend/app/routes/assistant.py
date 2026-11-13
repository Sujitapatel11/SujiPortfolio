"""Authenticated persistence API for assistant sessions, messages, proposals and approvals.

This module deliberately does not execute browser or desktop actions.
"""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.admin.auth import get_current_admin
from app.assistant.models import AssistantAction, AssistantAuditEvent, AssistantMessage, AssistantSession
from app.assistant.policy import PolicyViolation, build_action_proposal
from app.assistant.planner import PlannerUnavailable, plan_user_message
from app.assistant.schemas import ActionProposalRequest
from app.database import get_db

router = APIRouter(prefix="/api/assistant", tags=["personal-assistant"])
SESSION_TTL_HOURS = 12
ACTION_TTL_MINUTES = 10


class SessionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    input_mode: str = Field(default="voice", pattern="^(voice|text)$")
    device_id: str | None = Field(default=None, max_length=128)


class MessageCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(min_length=1, max_length=4000)
    input_mode: str = Field(default="voice", pattern="^(voice|text)$")


class ActionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    tool: str
    arguments: dict = Field(default_factory=dict)


class DecisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    decision: str = Field(pattern="^(approve|reject)$")
    reason: str | None = Field(default=None, max_length=500)


def _owned_session(db: Session, session_id: str, username: str) -> AssistantSession:
    item = db.query(AssistantSession).filter(
        AssistantSession.id == session_id,
        AssistantSession.owner_username == username,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Assistant session not found")
    now = datetime.now(timezone.utc)
    expires_at = item.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if item.status != "active" or expires_at <= now:
        raise HTTPException(status_code=410, detail="Assistant session has expired or is closed")
    return item


def _audit(db: Session, session_id: str, action_id: str | None, actor: str, event_type: str, details: dict | None = None):
    db.add(AssistantAuditEvent(
        session_id=session_id,
        action_id=action_id,
        actor=actor,
        event_type=event_type,
        details=details or {},
    ))


@router.post("/sessions", status_code=status.HTTP_201_CREATED)
def create_session(payload: SessionCreate, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    now = datetime.now(timezone.utc)
    item = AssistantSession(
        id=str(uuid4()),
        owner_username=current_admin["username"],
        status="active",
        input_mode=payload.input_mode,
        device_id=payload.device_id,
        created_at=now,
        updated_at=now,
        expires_at=now + timedelta(hours=SESSION_TTL_HOURS),
    )
    db.add(item)
    _audit(db, item.id, None, current_admin["username"], "session.created", {
        "input_mode": payload.input_mode,
        "device_paired": bool(payload.device_id),
    })
    db.commit()
    return {
        "session_id": item.id,
        "status": item.status,
        "input_mode": item.input_mode,
        "created_at": item.created_at,
        "expires_at": item.expires_at,
    }


@router.get("/sessions/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    item = _owned_session(db, session_id, current_admin["username"])
    return {
        "session_id": item.id,
        "status": item.status,
        "input_mode": item.input_mode,
        "device_id": item.device_id,
        "created_at": item.created_at,
        "expires_at": item.expires_at,
    }


@router.post("/sessions/{session_id}/messages", status_code=status.HTTP_201_CREATED)
def create_message(session_id: str, payload: MessageCreate, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    item = _owned_session(db, session_id, current_admin["username"])
    now = datetime.now(timezone.utc)
    user_message = AssistantMessage(
        id=str(uuid4()),
        session_id=item.id,
        role="user",
        input_mode=payload.input_mode,
        content=payload.text,
    )
    db.add(user_message)
    item.updated_at = now
    _audit(db, item.id, None, current_admin["username"], "message.received", {
        "input_mode": payload.input_mode,
        "character_count": len(payload.text),
    })

    try:
        plan = plan_user_message(payload.text)
    except PlannerUnavailable as exc:
        db.commit()
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    proposal_response = None
    response_status = plan["kind"]
    assistant_text = plan["message"]

    if plan["kind"] == "action":
        try:
            proposal = build_action_proposal(plan["request"])
        except (PolicyViolation, ValueError) as exc:
            assistant_text = "I can't propose that action under the current safety policy. " + str(exc)
            response_status = "unsupported"
            _audit(db, item.id, None, "assistant", "planner.policy_blocked", {
                "requested_tool": plan["request"].tool,
                "reason": str(exc)[:300],
            })
        else:
            action = AssistantAction(
                id=proposal.action_id,
                session_id=item.id,
                tool=proposal.tool,
                arguments=proposal.arguments,
                summary=proposal.summary,
                risk=proposal.risk,
                status="awaiting_approval",
                payload_sha256=proposal.payload_sha256,
                created_at=now,
                updated_at=now,
                expires_at=now + timedelta(minutes=ACTION_TTL_MINUTES),
            )
            db.add(action)
            _audit(db, item.id, action.id, "assistant", "action.proposed", {
                "tool": action.tool,
                "payload_sha256": action.payload_sha256,
                "approval_required": True,
            })
            proposal_response = {
                "action_id": proposal.action_id,
                "tool": proposal.tool,
                "arguments": proposal.arguments,
                "summary": proposal.summary,
                "risk": proposal.risk,
                "approval_required": True,
                "payload_sha256": proposal.payload_sha256,
                "expires_at": action.expires_at,
            }
            response_status = "awaiting_approval"
            assistant_text = "I prepared this action. Review the exact details and approve it before anything is executed."

    assistant_message = AssistantMessage(
        id=str(uuid4()),
        session_id=item.id,
        role="assistant",
        input_mode=payload.input_mode,
        content=assistant_text,
    )
    db.add(assistant_message)
    _audit(db, item.id, None, "assistant", "planner.responded", {"status": response_status})
    db.commit()

    return {
        "message_id": user_message.id,
        "assistant_message_id": assistant_message.id,
        "session_id": item.id,
        "message": assistant_text,
        "proposal": proposal_response,
        "status": response_status,
    }

@router.get("/sessions/{session_id}/messages")
def list_messages(session_id: str, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    item = _owned_session(db, session_id, current_admin["username"])
    messages = db.query(AssistantMessage).filter(
        AssistantMessage.session_id == item.id
    ).order_by(AssistantMessage.created_at.asc()).limit(100).all()
    return [{
        "message_id": message.id,
        "role": message.role,
        "input_mode": message.input_mode,
        "content": message.content,
        "created_at": message.created_at,
    } for message in messages]


@router.post("/sessions/{session_id}/actions", status_code=status.HTTP_201_CREATED)
def propose_action(session_id: str, payload: ActionCreate, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    item = _owned_session(db, session_id, current_admin["username"])
    try:
        proposal = build_action_proposal(ActionProposalRequest(tool=payload.tool, arguments=payload.arguments))
    except (PolicyViolation, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    now = datetime.now(timezone.utc)
    action = AssistantAction(
        id=proposal.action_id,
        session_id=item.id,
        tool=proposal.tool,
        arguments=proposal.arguments,
        summary=proposal.summary,
        risk=proposal.risk,
        status="awaiting_approval",
        payload_sha256=proposal.payload_sha256,
        created_at=now,
        updated_at=now,
        expires_at=now + timedelta(minutes=ACTION_TTL_MINUTES),
    )
    db.add(action)
    _audit(db, item.id, action.id, current_admin["username"], "action.proposed", {
        "tool": action.tool,
        "payload_sha256": action.payload_sha256,
        "approval_required": True,
    })
    db.commit()
    return {
        "action_id": action.id,
        "tool": action.tool,
        "arguments": action.arguments,
        "summary": action.summary,
        "risk": action.risk,
        "approval_required": True,
        "status": action.status,
        "expires_at": action.expires_at,
        "payload_sha256": action.payload_sha256,
    }


@router.get("/sessions/{session_id}/actions")
def list_actions(session_id: str, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    item = _owned_session(db, session_id, current_admin["username"])
    actions = db.query(AssistantAction).filter(
        AssistantAction.session_id == item.id
    ).order_by(AssistantAction.created_at.desc()).all()
    return [{
        "action_id": a.id,
        "tool": a.tool,
        "arguments": a.arguments,
        "summary": a.summary,
        "risk": a.risk,
        "status": a.status,
        "created_at": a.created_at,
        "expires_at": a.expires_at,
    } for a in actions]


@router.post("/actions/{action_id}/decision")
def decide_action(action_id: str, payload: DecisionRequest, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    action = db.query(AssistantAction).join(AssistantSession).filter(
        AssistantAction.id == action_id,
        AssistantSession.owner_username == current_admin["username"],
    ).first()
    if not action:
        raise HTTPException(status_code=404, detail="Assistant action not found")
    if action.status != "awaiting_approval":
        raise HTTPException(status_code=409, detail=f"Action is already {action.status}")

    session = action.session
    now = datetime.now(timezone.utc)
    session_expires_at = session.expires_at
    if session_expires_at.tzinfo is None:
        session_expires_at = session_expires_at.replace(tzinfo=timezone.utc)
    if session.status != "active" or session_expires_at <= now:
        raise HTTPException(status_code=410, detail="Assistant session has expired or is closed")
    expires_at = action.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        action.status = "expired"
        action.updated_at = now
        _audit(db, action.session_id, action.id, current_admin["username"], "action.expired")
        db.commit()
        raise HTTPException(status_code=410, detail="Action proposal has expired")

    if payload.decision == "approve":
        action.status = "approved"
        action.approved_by = current_admin["username"]
        action.approved_at = now
        event = "action.approved"
    else:
        action.status = "rejected"
        action.rejected_reason = payload.reason
        event = "action.rejected"

    action.updated_at = now
    _audit(db, action.session_id, action.id, current_admin["username"], event, {
        "reason": payload.reason if payload.decision == "reject" else None,
        "payload_sha256": action.payload_sha256,
    })
    db.commit()
    return {"action_id": action.id, "status": action.status}


@router.get("/sessions/{session_id}/audit")
def list_audit_events(session_id: str, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    item = _owned_session(db, session_id, current_admin["username"])
    events = db.query(AssistantAuditEvent).filter(
        AssistantAuditEvent.session_id == item.id
    ).order_by(AssistantAuditEvent.created_at.asc()).all()
    return [{
        "id": event.id,
        "action_id": event.action_id,
        "actor": event.actor,
        "event_type": event.event_type,
        "details": event.details,
        "created_at": event.created_at,
    } for event in events]
