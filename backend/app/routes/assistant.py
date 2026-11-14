"""Authenticated persistence API for assistant sessions, messages, proposals and approvals.

This module deliberately does not execute browser or desktop actions.
"""
from datetime import datetime, timedelta, timezone
from uuid import uuid4
import hashlib
import hmac
import secrets

from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.admin.auth import get_current_admin
from app.assistant.models import AssistantAction, AssistantAuditEvent, AssistantMessage, AssistantSession, AssistantDevice
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


class DeviceRegister(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=120)


class DeviceResult(BaseModel):
    model_config = ConfigDict(extra="forbid")
    command_id: str
    payload_sha256: str = Field(pattern="^[a-f0-9]{64}$")
    nonce: str = Field(min_length=32, max_length=64)
    outcome: str = Field(pattern="^(completed|failed)$")
    result_code: str = Field(min_length=1, max_length=80)
    message: str = Field(min_length=1, max_length=300)


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
    if payload.device_id:
        device = db.query(AssistantDevice).filter(
            AssistantDevice.id == payload.device_id,
            AssistantDevice.owner_username == current_admin["username"],
            AssistantDevice.is_active.is_(True),
        ).first()
        if not device:
            raise HTTPException(status_code=422, detail="Device is not paired and active for this owner")
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
        device_id = session.device_id
        if not device_id:
            raise HTTPException(status_code=409, detail="Pair a device and create a device-bound session before approving execution")
        device = db.query(AssistantDevice).filter(
            AssistantDevice.id == device_id,
            AssistantDevice.owner_username == current_admin["username"],
            AssistantDevice.is_active.is_(True),
        ).first()
        if not device:
            raise HTTPException(status_code=409, detail="Target device is not active")
        action.status = "approved"
        action.approved_by = current_admin["username"]
        action.approved_at = now
        action.target_device_id = device.id
        action.command_id = str(uuid4())
        action.execution_nonce = secrets.token_hex(32)
        event = "action.approved_and_queued"
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
    return {
        "action_id": action.id,
        "status": action.status,
        "command_id": action.command_id,
        "target_device_id": action.target_device_id,
    }


@router.post("/devices", status_code=status.HTTP_201_CREATED)
def register_device(
    payload: "DeviceRegister",
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    raw_token = secrets.token_urlsafe(48)
    device = AssistantDevice(
        id=str(uuid4()),
        owner_username=current_admin["username"],
        name=payload.name,
        token_sha256=hashlib.sha256(raw_token.encode()).hexdigest(),
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )
    db.add(device)
    db.commit()
    return {"device_id": device.id, "name": device.name, "device_token": raw_token}


@router.get("/devices")
def list_devices(db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    devices = db.query(AssistantDevice).filter(
        AssistantDevice.owner_username == current_admin["username"]
    ).order_by(AssistantDevice.created_at.desc()).all()
    return [{
        "device_id": device.id,
        "name": device.name,
        "is_active": device.is_active,
        "created_at": device.created_at,
        "revoked_at": device.revoked_at,
        "last_seen_at": device.last_seen_at,
    } for device in devices]


@router.post("/devices/{device_id}/revoke")
def revoke_device(
    device_id: str,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    device = db.query(AssistantDevice).filter(
        AssistantDevice.id == device_id,
        AssistantDevice.owner_username == current_admin["username"],
    ).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    device.is_active = False
    device.revoked_at = datetime.now(timezone.utc)
    db.commit()
    return {"device_id": device.id, "status": "revoked"}


def _authenticated_device(authorization: str | None, db: Session) -> AssistantDevice:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Device bearer token required")
    raw = authorization[7:].strip()
    digest = hashlib.sha256(raw.encode()).hexdigest()
    device = db.query(AssistantDevice).filter(AssistantDevice.token_sha256 == digest).first()
    if not device or not device.is_active:
        raise HTTPException(status_code=401, detail="Device credential is invalid or revoked")
    if not hmac.compare_digest(device.token_sha256, digest):
        raise HTTPException(status_code=401, detail="Device credential is invalid")
    return device


@router.get("/device/commands/next")
def claim_next_command(
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
):
    device = _authenticated_device(authorization, db)
    now = datetime.now(timezone.utc)
    # PostgreSQL row locking prevents two pollers claiming the same command.
    action = db.query(AssistantAction).join(AssistantSession).filter(
        AssistantAction.status == "approved",
        AssistantAction.target_device_id == device.id,
        AssistantSession.owner_username == device.owner_username,
        AssistantSession.status == "active",
        AssistantSession.expires_at > now,
        AssistantAction.expires_at > now,
    ).order_by(AssistantAction.approved_at.asc()).with_for_update(skip_locked=True).first()
    device.last_seen_at = now
    if not action:
        db.commit()
        return {"command": None}
    action.status = "executing"
    action.claimed_at = now
    action.updated_at = now
    _audit(db, action.session_id, action.id, "device:" + device.id, "action.claimed", {
        "command_id": action.command_id,
        "payload_sha256": action.payload_sha256,
    })
    db.commit()
    return {"command": {
        "command_id": action.command_id,
        "action_id": action.id,
        "device_id": device.id,
        "tool": action.tool,
        "arguments": action.arguments,
        "payload_sha256": action.payload_sha256,
        "nonce": action.execution_nonce,
        "expires_at": action.expires_at,
    }}


@router.post("/device/commands/{command_id}/result")
def submit_command_result(
    command_id: str,
    payload: DeviceResult,
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
):
    device = _authenticated_device(authorization, db)
    if payload.command_id != command_id:
        raise HTTPException(status_code=422, detail="Command ID mismatch")
    action = db.query(AssistantAction).filter(
        AssistantAction.command_id == command_id,
        AssistantAction.target_device_id == device.id,
    ).with_for_update().first()
    if not action:
        raise HTTPException(status_code=404, detail="Command not found for this device")
    if action.status != "executing":
        raise HTTPException(status_code=409, detail="Command is not awaiting a result")
    if not hmac.compare_digest(action.payload_sha256, payload.payload_sha256):
        raise HTTPException(status_code=409, detail="Payload hash mismatch")
    if not action.execution_nonce or not hmac.compare_digest(action.execution_nonce, payload.nonce):
        raise HTTPException(status_code=409, detail="Execution nonce mismatch or replay")
    now = datetime.now(timezone.utc)
    action.status = payload.outcome
    action.result = {"code": payload.result_code, "message": payload.message[:300]}
    action.completed_at = now
    action.updated_at = now
    _audit(db, action.session_id, action.id, "device:" + device.id, "action." + payload.outcome, {
        "command_id": command_id,
        "payload_sha256": payload.payload_sha256,
        "result_code": payload.result_code,
    })
    db.commit()
    return {"command_id": command_id, "status": action.status}


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
