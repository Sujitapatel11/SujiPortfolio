"""Validated API/domain schemas for the personal assistant foundation."""
from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class ActionProposalRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tool: Literal["browser.open_url", "desktop.open_application"]
    arguments: dict[str, Any] = Field(default_factory=dict)


class ActionProposal(BaseModel):
    action_id: str
    tool: str
    arguments: dict[str, Any]
    summary: str
    risk: Literal["low", "medium", "high"]
    approval_required: Literal[True] = True
    payload_sha256: str


class ApprovalDecision(BaseModel):
    model_config = ConfigDict(extra="forbid")

    decision: Literal["approve", "reject"]
    reason: str | None = Field(default=None, max_length=500)


class ActionStatus(BaseModel):
    action_id: str
    status: Literal[
        "proposed", "awaiting_approval", "approved", "rejected",
        "executing", "completed", "failed", "cancelled", "expired"
    ]
    detail: str | None = None


class AssistantMessageRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1, max_length=4000)
    input_mode: Literal["voice", "text"] = "voice"


class AssistantMessageResponse(BaseModel):
    message: str
    proposal: ActionProposal | None = None
    status: Literal["needs_clarification", "awaiting_approval", "unsupported"]
