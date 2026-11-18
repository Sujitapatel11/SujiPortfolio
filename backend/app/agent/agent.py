"""Grounded Ask Suji agent with persistent, role-scoped conversation memory."""
import logging
import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

from dotenv import load_dotenv
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import ChatConversation, ChatMessage
from app.agent.tools import (
    save_client_inquiry, book_appointment_request,
    trigger_job_search, list_recent_inquiries, get_proposal, send_whatsapp_message,
)
from app.agent.retrieval import retrieve_relevant_chunks, RetrievalUnavailable
from app.agent.persona import build_system_prompt, SUJI_PERSONA

load_dotenv()
logger = logging.getLogger("sujis_world.agent")
PUBLIC_SESSION_TTL_DAYS = 30
ADMIN_SESSION_TTL_DAYS = 30
CONTEXT_MESSAGE_LIMIT = 20
SUMMARY_TRIGGER_MESSAGES = 40


class ConversationAccessError(ValueError):
    """The conversation does not belong to this session's role/owner."""


class ConversationExpired(ValueError):
    """The conversation capability has expired."""


def has_llm_configuration() -> bool:
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    return bool(
        (openai_key and openai_key != "your_openai_api_key_here")
        or (anthropic_key and anthropic_key != "your_anthropic_api_key_here")
    )


def get_llm():
    """Initialize the first configured provider; never substitute a canned answer."""
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "").strip()

    if openai_key and openai_key != "your_openai_api_key_here":
        try:
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(model="gpt-4o-mini", temperature=0.2, api_key=openai_key, timeout=25, max_retries=1)
        except Exception:
            logger.exception("OpenAI provider initialization failed.")

    if anthropic_key and anthropic_key != "your_anthropic_api_key_here":
        try:
            from langchain_anthropic import ChatAnthropic
            return ChatAnthropic(model="claude-3-5-haiku-20241022", temperature=0.2, api_key=anthropic_key, timeout=25, max_retries=1)
        except Exception:
            logger.exception("Anthropic provider initialization failed.")

    logger.warning("No usable Ask Suji LLM provider is configured.")
    return None


def _resolve_conversation(
    db: Session,
    conversation_id: Optional[str],
    is_admin_context: bool,
    owner_username: Optional[str],
) -> ChatConversation:
    scope = "admin" if is_admin_context else "public"
    owner = (owner_username or "").strip() if is_admin_context else None
    if is_admin_context and not owner:
        raise ConversationAccessError("An authenticated owner identity is required for admin chat.")

    candidate_id = None
    if conversation_id:
        try:
            candidate_id = str(uuid.UUID(conversation_id))
        except (ValueError, TypeError, AttributeError):
            # Pre-upgrade clients used predictable labels; do not trust or reuse them.
            candidate_id = None

    now = datetime.now(timezone.utc)
    if candidate_id:
        existing = db.query(ChatConversation).filter(ChatConversation.id == candidate_id).first()
        if existing:
            if existing.scope != scope or existing.owner_username != owner:
                raise ConversationAccessError("This conversation is not available in the current session.")
            expires_at = existing.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at <= now:
                raise ConversationExpired("This conversation has expired. Start a new conversation.")
            existing.updated_at = now
            return existing

    # Lazy bounded retention cleanup: purge up to 100 expired conversations per new session.
    # Keep the requested identifier untouched so expired-session requests return HTTP 410.
    expired = db.query(ChatConversation).filter(
        ChatConversation.expires_at <= now,
        ChatConversation.id != (candidate_id or ""),
    ).order_by(ChatConversation.expires_at.asc()).limit(100).all()
    for expired_conversation in expired:
        db.delete(expired_conversation)
    if expired:
        db.flush()

    ttl_days = ADMIN_SESSION_TTL_DAYS if is_admin_context else PUBLIC_SESSION_TTL_DAYS
    conversation = ChatConversation(
        id=candidate_id or str(uuid.uuid4()),
        scope=scope,
        owner_username=owner,
        created_at=now,
        updated_at=now,
        expires_at=now + timedelta(days=ttl_days),
    )
    db.add(conversation)
    db.flush()
    return conversation


def _message_content(message) -> str:
    content = getattr(message, "content", "")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(
            str(part.get("text", "")) if isinstance(part, dict) else str(part)
            for part in content
        )
    return str(content)


def _maybe_summarize(db: Session, conversation: ChatConversation, llm, messages: List[ChatMessage]) -> None:
    """Summarize older turns after 40 messages; always retain the full audit trail in PostgreSQL."""
    if len(messages) < SUMMARY_TRIGGER_MESSAGES:
        return
    older = messages[:-CONTEXT_MESSAGE_LIMIT]
    pending = [m for m in older if m.id > (conversation.summary_through_message_id or 0)]
    if len(pending) < 10:
        return
    try:
        from langchain_core.messages import HumanMessage, SystemMessage
        transcript = "\n".join(f"{m.role}: {m.content[:2000]}" for m in pending)
        result = llm.invoke([
            SystemMessage(content=(
                "Summarize this conversation for continuity. Preserve only clearly stated, useful facts, "
                "preferences, project requirements and unresolved questions. Do not infer facts. "
                "Do not retain passwords, tokens, financial account details or highly sensitive personal data. "
                "Label uncertain information as uncertain. Keep under 1200 characters."
            )),
            HumanMessage(content=transcript),
        ])
        summary = _message_content(result).strip()
        if summary:
            conversation.summary = summary[:5000]
            conversation.summary_through_message_id = pending[-1].id
            db.flush()
    except Exception:
        logger.exception("Conversation summarization failed; continuing with bounded recent context.")


def _tool_results(messages) -> List[str]:
    results = []
    for message in messages:
        if message.__class__.__name__ == "ToolMessage":
            text = _message_content(message).strip()
            if text:
                results.append(text)
    return results


def run_agent_message(
    user_message: str,
    conversation_id: Optional[str] = None,
    db: Optional[Session] = None,
    is_admin_context: bool = False,
    owner_username: Optional[str] = None,
) -> Tuple[str, str, str, List[dict]]:
    """Run Ask Suji and persist every turn under a public capability or authenticated owner scope."""
    close_session = db is None
    if db is None:
        db = SessionLocal()
    try:
        conversation = _resolve_conversation(db, conversation_id, is_admin_context, owner_username)
        db.add(ChatMessage(conversation_id=conversation.id, role="user", content=user_message, sources=[]))
        db.flush()

        try:
            llm = get_llm()
            if llm is None:
                reply = (
                    "Ask Suji is temporarily in degraded mode because no AI provider is configured. "
                    "Your message was saved to this conversation, but I have not generated an AI answer "
                    "or performed any action. Please try again after the provider is configured."
                )
                sources: List[dict] = []
                status = "degraded"
            else:
                retrieved = retrieve_relevant_chunks(
                    query=user_message, top_k=5, db=db, is_admin_context=is_admin_context
                )
                sources = [
                    {
                        "source": chunk.source,
                        "similarity": round(float(getattr(chunk, "_retrieval_similarity", 0.0)), 3),
                        "excerpt": chunk.content[:220],
                    }
                    for chunk in retrieved
                ]

                system_prompt = build_system_prompt(
                    retrieved_chunks=retrieved,
                    persona=SUJI_PERSONA,
                    is_admin_context=is_admin_context,
                )
                from langchain.agents import create_agent
                from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

                persisted = db.query(ChatMessage).filter(
                    ChatMessage.conversation_id == conversation.id
                ).order_by(ChatMessage.id.asc()).all()
                _maybe_summarize(db, conversation, llm, persisted)

                messages = []
                if conversation.summary:
                    messages.append(SystemMessage(content="Verified conversation continuity summary (user statements only):\n" + conversation.summary))
                for item in persisted[-CONTEXT_MESSAGE_LIMIT:]:
                    if item.role == "user":
                        messages.append(HumanMessage(content=item.content))
                    elif item.role == "assistant":
                        messages.append(AIMessage(content=item.content))

                if is_admin_context:
                    tools = [trigger_job_search, list_recent_inquiries, get_proposal, send_whatsapp_message]
                else:
                    tools = [save_client_inquiry, book_appointment_request]

                agent_graph = create_agent(model=llm, tools=tools, system_prompt=system_prompt)
                result = agent_graph.invoke({"messages": messages})
                result_messages = result.get("messages", []) if isinstance(result, dict) else []
                tool_results = _tool_results(result_messages)

                reply = _message_content(result_messages[-1]).strip() if result_messages else ""
                failed_tool = next(
                    (item for item in tool_results if item.startswith(("ERROR:", "NEED_CLARIFICATION:"))),
                    None,
                )
                successful_tool = next((item for item in reversed(tool_results) if item.startswith("SUCCESS:")), None)
                if failed_tool:
                    reply = failed_tool
                elif successful_tool:
                    # All tool-backed confirmations must come from the persisted tool result.
                    reply = successful_tool
                elif not reply:
                    raise RuntimeError("The AI provider returned an empty response.")

                if not successful_tool and re.search(
                    r"\b(?:i|we)\s+(?:have\s+|has\s+|'ve\s+)?"
                    r"(?:successfully\s+)?(?:submitted|recorded|saved|booked|scheduled|sent|notified|executed|triggered|created)\b",
                    reply,
                    flags=re.IGNORECASE,
                ):
                    reply = (
                        "I haven't completed or submitted that action. No successful tool result confirms it. "
                        "Tell me what you want to do and I'll ask for any missing details."
                    )
                status = "ok"
        except RetrievalUnavailable as exc:
            logger.error("Ask Suji retrieval unavailable: %s", exc, exc_info=True)
            reply = (
                "Ask Suji is in degraded mode because the knowledge retrieval service is unavailable. "
                "No answer or action was generated. Please retry later."
            )
            sources = []
            status = "degraded"
        except Exception as exc:
            logger.error("Ask Suji agent execution failed: %s", exc, exc_info=True)
            reply = (
                "Ask Suji couldn't complete this response because the AI service returned an error. "
                "No action is being reported as completed. Please retry."
            )
            sources = []
            status = "degraded"

        db.add(ChatMessage(
            conversation_id=conversation.id,
            role="assistant",
            content=reply,
            sources=sources,
        ))
        conversation.updated_at = datetime.now(timezone.utc)
        db.commit()
        return reply, conversation.id, status, sources
    except Exception:
        db.rollback()
        raise
    finally:
        if close_session:
            db.close()


def get_conversation_history(
    db: Session,
    conversation_id: str,
    is_admin_context: bool = False,
    owner_username: Optional[str] = None,
) -> List[dict]:
    conversation = _resolve_existing_conversation(db, conversation_id, is_admin_context, owner_username)
    items = db.query(ChatMessage).filter(
        ChatMessage.conversation_id == conversation.id
    ).order_by(ChatMessage.id.asc()).limit(100).all()
    return [
        {"role": item.role, "text": item.content, "sources": item.sources or [], "created_at": item.created_at}
        for item in items
    ]


def _resolve_existing_conversation(db: Session, conversation_id: str, is_admin_context: bool, owner_username: Optional[str]):
    try:
        cid = str(uuid.UUID(conversation_id))
    except (ValueError, TypeError, AttributeError) as exc:
        raise ConversationAccessError("Invalid conversation identifier.") from exc
    scope = "admin" if is_admin_context else "public"
    owner = (owner_username or "").strip() if is_admin_context else None
    item = db.query(ChatConversation).filter(
        ChatConversation.id == cid,
        ChatConversation.scope == scope,
        ChatConversation.owner_username == owner,
    ).first()
    if not item:
        raise ConversationAccessError("Conversation not found.")
    expires_at = item.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= datetime.now(timezone.utc):
        raise ConversationExpired("This conversation has expired.")
    return item
