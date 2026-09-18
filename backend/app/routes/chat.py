from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
import jwt

from app.database import get_db
from app.agent import run_agent_message
from app.admin.auth import JWT_SECRET_KEY, JWT_ALGORITHM, ADMIN_USERNAME

router = APIRouter(prefix="/api/chat", tags=["chat"])

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, example="What services does Sujita offer?")
    conversation_id: Optional[str] = Field(None, example="conv_12345")
    is_admin_context: Optional[bool] = Field(False, description="Flag for admin context (requires valid Authorization header)")

class ChatResponse(BaseModel):
    reply: str
    conversation_id: str

def check_is_admin(request: Request) -> bool:
    """Helper to verify if request carries valid Admin JWT token."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            username = payload.get("sub")
            if username == ADMIN_USERNAME:
                return True
        except Exception:
            pass
    return False

@router.post("", response_model=ChatResponse, status_code=status.HTTP_200_OK)
def chat_with_agent(req: ChatRequest, request: Request, db: Session = Depends(get_db)):
    """
    Conversational RAG AI Agent endpoint ("Ask Suji").
    - Public Visitor context (default): Answers profile questions, records inquiries, books appointments.
    - Admin context (requires valid JWT token): Enables command tools (job search, inquiries list, proposal retrieval, WhatsApp link generation).
    """
    is_admin = check_is_admin(request)
    
    try:
        reply, cid = run_agent_message(
            user_message=req.message,
            conversation_id=req.conversation_id,
            db=db,
            is_admin_context=is_admin
        )
        return ChatResponse(reply=reply, conversation_id=cid)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat agent error: {str(e)}"
        )
