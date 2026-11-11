import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
import jwt

from app.database import get_db
from app.agent import run_agent_message
from app.admin.auth import JWT_ALGORITHM, ADMIN_USERNAME, _get_effective_jwt_secret
from app.routes.jobs_public import perform_public_search

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
            payload = jwt.decode(token, _get_effective_jwt_secret(), algorithms=[JWT_ALGORITHM])
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

    # Public job discovery is read-only and does not require owner credentials.
    message_lower = req.message.lower().strip()
    job_intent = any(term in message_lower for term in ["job", "jobs", "internship", "internships", "naukri", "नौकरी", "vacancy", "hiring", "career"])
    search_intent = any(term in message_lower for term in ["find", "search", "khoj", "khojo", "dhund", "ढूंढ", "खोज", "show me", "look for"]) or message_lower in {"job", "jobs", "job hunter"}
    if job_intent and search_intent:
        try:
            known_terms = ["python", "fastapi", "django", "backend", "frontend", "react", "javascript", "typescript", "java", "spring", "machine learning", "ai", "data science", "full stack", "software engineer", "cybersecurity", "cloud", "devops", "data analyst", "designer", "marketing"]
            keywords = [term for term in known_terms if term in message_lower]
            if not keywords:
                cleaned = re.sub(r"\\b(find|search|show me|jobs?|job hunter|internships?|naukri|khojo|khoj|for|in|at|worldwide|global)\\b", " ", message_lower)
                keywords = [word for word in re.findall(r"[a-zA-Z][a-zA-Z+#.]{2,}", cleaned)[:5]]
            work_mode = "remote" if "remote" in message_lower else ("hybrid" if "hybrid" in message_lower else ("on-site" if any(x in message_lower for x in ["on-site", "onsite", "office"]) else None))
            employment_type = next((x for x in ["internship", "full-time", "part-time", "freelance", "contract", "apprenticeship", "temporary"] if x in message_lower), None)
            experience_level = next((x for x in ["fresher", "entry-level", "junior", "mid-level", "senior", "lead"] if x in message_lower), None)
            location_match = re.search(r"\\b(?:in|from|at)\\s+([a-z][a-z .-]{1,35}?)(?=\\s+(?:for|as|with|remote|hybrid|on-site|onsite|internship|full-time|part-time)|$)", message_lower)
            location = location_match.group(1).strip() if location_match else None
            results = perform_public_search(keywords, work_mode, location, employment_type, experience_level, limit=20)
            lines = [f"Job Hunter found {results['count']} matching listings.", "Filters: " + ", ".join(f"{k}={v}" for k, v in results["filters"].items() if v) if any(results["filters"].values()) else "Filters: broad search."]
            for index, job in enumerate(results["jobs"], 1):
                company = f" at {job['company']}" if job.get("company") else ""
                details = " | ".join(str(v) for v in [job.get("location"), job.get("work_mode"), job.get("employment_type"), job.get("experience_level"), job.get("salary")] if v)
                lines.append(f"{index}. {job['title']}{company} | {job['source']} | Match {round(job['match_score'] * 100)}%\n{details}\nApply: {job['url']}")
            if results["warnings"]:
                lines.append("Unavailable sources: " + ", ".join(w["source"] for w in results["warnings"]))
            if not results["jobs"]:
                lines.append("No matching listings were returned. Try broader keywords or remove restrictive filters.")
            lines.append(results["coverage_note"])
            return ChatResponse(reply="\\n\\n".join(lines), conversation_id=req.conversation_id or "public-job-search")
        except Exception:
            logger = __import__("logging").getLogger("sujis_world.chat")
            logger.exception("Public job search failed")
            raise HTTPException(status_code=502, detail="Job sources are temporarily unavailable. Please try again shortly.")

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
