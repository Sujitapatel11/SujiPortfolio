"""Ask Suji chat API with authenticated role separation and explicit degraded responses."""
import logging
from typing import Optional, Literal
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.agent import run_agent_message
from app.agent.agent import (
    get_conversation_history, has_llm_configuration,
    ConversationAccessError, ConversationExpired,
)
from app.models import KnowledgeChunk
from app.admin.auth import JWT_SECRET_KEY, JWT_ALGORITHM, ADMIN_USERNAME

logger = logging.getLogger("sujis_world.chat")
router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000, example="What services does Sujita offer?")
    conversation_id: Optional[str] = Field(None, max_length=64)
    is_admin_context: Optional[bool] = Field(False, description="Ignored for authorization; admin mode requires a valid JWT.")


class ChatSource(BaseModel):
    source: str
    similarity: float
    excerpt: str


class ChatResponse(BaseModel):
    reply: str
    conversation_id: str
    status: Literal["ok", "degraded"]
    sources: list[ChatSource] = Field(default_factory=list)


def check_admin_username(request: Request) -> Optional[str]:
    """Return the owner identity only when the request includes a valid admin JWT."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        username = payload.get("sub")
        if username == ADMIN_USERNAME:
            return username
    except Exception:
        logger.info("Invalid admin token supplied to public chat endpoint.")
    return None


@router.get("/status")
def chat_status(db: Session = Depends(get_db)):
    """Report observable backend state without claiming provider credentials are live."""
    try:
        db.execute(text("SELECT 1"))
        knowledge_count = db.query(KnowledgeChunk).filter(
            KnowledgeChunk.source.like("profile:%"),
            KnowledgeChunk.embedding.isnot(None),
        ).count()
        provider_configured = has_llm_configuration()
        return {
            "api": "online",
            "provider_configured": provider_configured,
            "provider_check": "not_verified_until_first_request" if provider_configured else "not_configured",
            "public_knowledge_chunks": knowledge_count,
            "retrieval_configured": knowledge_count > 0,
        }
    except Exception as exc:
        logger.exception("Ask Suji status check failed.")
        raise HTTPException(status_code=503, detail="Chat backend dependencies are unavailable.") from exc


@router.post("", response_model=ChatResponse, status_code=status.HTTP_200_OK)
def chat_with_agent(req: ChatRequest, request: Request, db: Session = Depends(get_db)):
    """Public chat by default; admin context is derived exclusively from a validated JWT."""
    owner_username = check_admin_username(request)
    is_admin = bool(owner_username)
    try:
        reply, cid, response_status, sources = run_agent_message(
            user_message=req.message,
            conversation_id=req.conversation_id,
            db=db,
            is_admin_context=is_admin,
            owner_username=owner_username,
        )
        return ChatResponse(reply=reply, conversation_id=cid, status=response_status, sources=sources)
    except ConversationExpired as exc:
        raise HTTPException(status_code=410, detail=str(exc)) from exc
    except ConversationAccessError:
        raise HTTPException(status_code=404, detail="Conversation not found for this session.")
    except Exception:
        logger.exception("Chat agent request failed.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The assistant could not save this message. Please try again.",
        )


@router.get("/{conversation_id}/messages")
def read_conversation(conversation_id: str, request: Request, db: Session = Depends(get_db)):
    owner_username = check_admin_username(request)
    try:
        return get_conversation_history(
            db, conversation_id, is_admin_context=bool(owner_username), owner_username=owner_username
        )
    except ConversationExpired as exc:
        raise HTTPException(status_code=410, detail=str(exc)) from exc
    except ConversationAccessError:
        raise HTTPException(status_code=404, detail="Conversation not found for this session.")
