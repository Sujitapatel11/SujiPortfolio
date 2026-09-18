from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.agent import run_agent_message

router = APIRouter(prefix="/api/chat", tags=["chat"])

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, example="What services does Sujita offer?")
    conversation_id: Optional[str] = Field(None, example="conv_12345")

class ChatResponse(BaseModel):
    reply: str
    conversation_id: str

@router.post("", response_model=ChatResponse, status_code=status.HTTP_200_OK)
def chat_with_agent(req: ChatRequest, db: Session = Depends(get_db)):
    """
    Conversational RAG AI Agent endpoint ("Ask Suji").
    Answers questions about Sujita's profile, skills, projects (SoulCare & AIEC), and services.
    Uses pgvector similarity search + Jarvis persona prompting.
    Guides project inquiries and saves qualified leads to database.
    """
    try:
        reply, cid = run_agent_message(
            user_message=req.message,
            conversation_id=req.conversation_id,
            db=db
        )
        return ChatResponse(reply=reply, conversation_id=cid)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat agent error: {str(e)}"
        )

