import os
import uuid
import logging
import re
from typing import Dict, List, Tuple, Optional
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from app.database import SessionLocal
from app.data.profile import PROFILE_DATA
from app.agent.tools import (
    save_client_inquiry,
    book_appointment_request,
    trigger_job_search,
    list_recent_inquiries,
    get_proposal,
    send_whatsapp_message
)
from app.agent.retrieval import retrieve_relevant_chunks
from app.agent.persona import build_system_prompt, SUJI_PERSONA

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger("sujis_world.agent")

# In-memory session store for conversation histories
CONVERSATION_STORE: Dict[str, List[Dict[str, str]]] = {}

def get_llm():
    """Dynamically initialize OpenAI or Anthropic Chat Model based on available environment variables."""
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "").strip()

    if openai_key and openai_key != "your_openai_api_key_here":
        try:
            from langchain_openai import ChatOpenAI
            logger.info("Initializing ChatOpenAI (gpt-4o-mini)...")
            return ChatOpenAI(model="gpt-4o-mini", temperature=0.7, api_key=openai_key)
        except Exception as e:
            logger.warning(f"Could not initialize ChatOpenAI: {e}")

    if anthropic_key and anthropic_key != "your_anthropic_api_key_here":
        try:
            from langchain_anthropic import ChatAnthropic
            logger.info("Initializing ChatAnthropic (claude-3-5-haiku-20241022)...")
            return ChatAnthropic(model="claude-3-5-haiku-20241022", temperature=0.7, api_key=anthropic_key)
        except Exception as e:
            logger.warning(f"Could not initialize ChatAnthropic: {e}")

    logger.info("No active LLM API key detected. Using fallback conversational mode.")
    return None

def fallback_conversational_response(user_msg: str, history: List[Dict[str, str]], is_admin_context: bool = False) -> str:
    """
    Intelligent fallback intake responder when no LLM key is set in .env.
    Differentiates between Public Visitor context and Private Admin context.
    """
    msg_lower = user_msg.lower()

    if is_admin_context:
        # ADMIN FALLBACK COMMANDS
        if "search" in msg_lower and ("job" in msg_lower or "target" in msg_lower):
            res = trigger_job_search.invoke({"keywords": ["python", "fastapi", "react", "ai"]})
            return f"⚡ [ADMIN COMMAND EXECUTED]\n{res}"

        if "inquir" in msg_lower or "lead" in msg_lower:
            res = list_recent_inquiries.invoke({"limit": 5})
            return f"⚡ [ADMIN COMMAND EXECUTED]\n{res}"

        if "proposal" in msg_lower:
            match = re.search(r'proposal\s+(?:for\s+)?([A-Za-z0-9_\s]+)', user_msg, re.IGNORECASE)
            target = match.group(1).strip() if match else "1"
            res = get_proposal.invoke({"job_title_or_id": target})
            return f"⚡ [ADMIN COMMAND EXECUTED]\n{res}"

        if "whatsapp" in msg_lower or "wa.me" in msg_lower or "message" in msg_lower:
            # Check for phone number or recipient
            num_match = re.search(r'(\+?\d[\d\s-]{6,}\d)', user_msg)
            if num_match:
                recipient = num_match.group(1)
                msg_text = "Hi! Following up on your project inquiry with Sujita."
                if "saying" in msg_lower or "text" in msg_lower:
                    parts = re.split(r'saying|text', user_msg, flags=re.IGNORECASE)
                    if len(parts) > 1:
                        msg_text = parts[1].strip(" '\"")
                res = send_whatsapp_message.invoke({"recipient_name_or_number": recipient, "message": msg_text})
                return f"⚡ [ADMIN COMMAND EXECUTED]\n{res}"
            else:
                name_match = re.search(r'(?:to|send)\s+([A-Za-z]+)', user_msg, re.IGNORECASE)
                recipient = name_match.group(1) if name_match else "Client"
                res = send_whatsapp_message.invoke({"recipient_name_or_number": recipient, "message": "Hello"})
                return f"⚡ [ADMIN COMMAND EXECUTED]\n{res}"

        return (
            "⚡ **Suji Admin Control Assistant**\n"
            "Available Admin Commands:\n"
            "- 'trigger job search' / 'search for new jobs'\n"
            "- 'list recent inquiries'\n"
            "- 'get proposal for job #1'\n"
            "- 'send whatsapp message to +1234567890 saying hello'"
        )

    # PUBLIC VISITOR CONTEXT FALLBACK
    # 1. Refuse admin-style commands cleanly
    if any(k in msg_lower for k in ["search for job", "trigger job", "list proposal", "send whatsapp", "wa.me"]):
        return (
            "I am Sujita's public visitor assistant and do not have permission to execute internal administrative commands. "
            "If you would like to discuss a project or schedule a call with Sujita, I'd be happy to assist you!"
        )

    # 2. Appointment Booking Detection (if email + appointment keywords are present)
    is_appointment_intent = any(k in msg_lower for k in ["book", "appointment", "schedule", "meet", "call", "talk"])
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', user_msg)

    if is_appointment_intent and email_match:
        email = email_match.group(0)
        name_match = re.search(r'(?:name is|i am|i\'m)\s+([A-Za-z\s]+?)(?:,|\.|\s+email|$)', user_msg, re.IGNORECASE)
        name = name_match.group(1).strip() if name_match else "Visitor"

        time_match = re.search(r'(?:at|on|for|time)\s+([A-Za-z0-9\s:]+?)(?:,|\.|\s+purpose|$)', user_msg, re.IGNORECASE)
        preferred_time = time_match.group(1).strip() if time_match else "Tomorrow afternoon"

        res = book_appointment_request.invoke({
            "name": name,
            "email": email,
            "preferred_time": preferred_time,
            "purpose": user_msg
        })
        return (
            f"Thank you, {name}! I have submitted your appointment request for **{preferred_time}**. "
            f"Sujita has received your request ({email}) and will confirm within 24 hours via email!"
        )

    # 3. Lead capture detection (if email is present)
    if email_match:
        email = email_match.group(0)
        name_match = re.search(r'(?:name is|i am|i\'m)\s+([A-Za-z\s]+?)(?:,|\.|\s+email|$)', user_msg, re.IGNORECASE)
        name = name_match.group(1).strip() if name_match else "Interested Client"
        
        budget_match = re.search(r'(\$\d+[\d,]*|\d+\s*(?:k|thousand|dollars))', user_msg, re.IGNORECASE)
        budget = budget_match.group(0) if budget_match else "$5,000"

        project_type = "Full-Stack Web App"
        if "backend" in msg_lower or "api" in msg_lower:
            project_type = "Backend/API Development"
        elif "ai" in msg_lower or "agent" in msg_lower or "ml" in msg_lower:
            project_type = "AI/ML Integration"
        elif "saas" in msg_lower or "mvp" in msg_lower:
            project_type = "SaaS/MVP Building"

        result = save_client_inquiry.invoke({
            "name": name,
            "email": email,
            "project_type": project_type,
            "budget": budget,
            "message": user_msg
        })
        return (
            f"Thank you, {name}! I have recorded your inquiry for a **{project_type}** with budget **{budget}**. "
            f"Sujita has received your details ({email}) and will follow up with you personally very soon!"
        )

    # Check for projects query
    if any(k in msg_lower for k in ["project", "portfolio", "work", "soulcare", "aiec"]):
        return (
            "Sujita has built two featured platforms:\n"
            "1. **SoulCare**: Private journaling with AI mood insights and an anonymous community with trust-based identity reveal.\n"
            "2. **AIEC**: Education consultancy platform featuring an admin panel, student inquiry management, counsellor matching, application tracking, and university recommendations.\n\n"
            "Would you like to discuss building a project with similar features or schedule a consultation call?"
        )

    # Check for services, pricing, or appointment query
    if any(k in msg_lower for k in ["service", "pricing", "cost", "price", "rate", "budget", "mvp", "backend", "meet", "call"]):
        return (
            "Sujita offers 4 main services:\n"
            "- **Full-Stack Web Apps**\n"
            "- **Backend/API Development**\n"
            "- **SaaS/MVP Building**\n"
            "- **AI/ML Integration**\n\n"
            "Would you like to submit a project inquiry or book a 1-on-1 appointment call with Sujita? "
            "Just share your name, email, and preferred date/time to book a call!"
        )

    # Check for skills query
    if any(k in msg_lower for k in ["skill", "stack", "technology", "tech", "react", "python", "fastapi"]):
        skills_list = ", ".join(PROFILE_DATA["skills"])
        return (
            f"Sujita specializes in full-stack web engineering and AI development. Her skills include: {skills_list}. "
            "What tech stack or requirements do you have for your project?"
        )

    return (
        "Hi! I'm Ask Suji, Sujita's AI assistant. Sujita builds Full-Stack Web Apps, custom FastAPI backends, "
        "and AI agents (like SoulCare & AIEC). Are you looking to build a project or book a consultation call with Sujita? "
        "Feel free to share your name, email, and preferred date/time to get started!"
    )

def run_agent_message(
    user_message: str,
    conversation_id: Optional[str] = None,
    db: Optional[Session] = None,
    is_admin_context: bool = False
) -> Tuple[str, str]:
    """
    Process a user message through the RAG + Persona LangChain agent, maintaining chat history.
    Strictly separates Public Visitor tools from Private Admin tools.

    - is_admin_context = False (Public): tools = [save_client_inquiry, book_appointment_request]
    - is_admin_context = True (Admin): tools = [trigger_job_search, list_recent_inquiries, get_proposal, send_whatsapp_message]
    """
    cid = conversation_id or str(uuid.uuid4())
    if cid not in CONVERSATION_STORE:
        CONVERSATION_STORE[cid] = []

    history = CONVERSATION_STORE[cid]
    llm = get_llm()

    if llm is None:
        reply = fallback_conversational_response(user_message, history, is_admin_context=is_admin_context)
        history.append({"role": "user", "content": user_message})
        history.append({"role": "assistant", "content": reply})
        return reply, cid

    try:
        # Step 1 & 2: RAG retrieval & dynamic prompt construction
        retrieved_chunks = retrieve_relevant_chunks(query=user_message, top_k=5, db=db)
        system_prompt = build_system_prompt(
            retrieved_chunks=retrieved_chunks,
            persona=SUJI_PERSONA,
            is_admin_context=is_admin_context
        )

        # Step 3: Agent initialization with LangChain and context-isolated tools
        from langchain.agents import create_agent
        from langchain_core.messages import HumanMessage, AIMessage

        if is_admin_context:
            tools = [trigger_job_search, list_recent_inquiries, get_proposal, send_whatsapp_message]
        else:
            tools = [save_client_inquiry, book_appointment_request]

        agent_graph = create_agent(model=llm, tools=tools, system_prompt=system_prompt)

        messages = []
        for h in history[-10:]:
            if h["role"] == "user":
                messages.append(HumanMessage(content=h["content"]))
            elif h["role"] == "assistant":
                messages.append(AIMessage(content=h["content"]))
        messages.append(HumanMessage(content=user_message))

        res = agent_graph.invoke({"messages": messages})

        reply = ""
        if isinstance(res, dict) and "messages" in res and res["messages"]:
            last_msg = res["messages"][-1]
            reply = getattr(last_msg, "content", str(last_msg))
        else:
            reply = str(res)

        if not reply:
            reply = "I'm here to assist you!"

        history.append({"role": "user", "content": user_message})
        history.append({"role": "assistant", "content": reply})

        return reply, cid

    except Exception as e:
        logger.error(f"Error executing RAG LangChain agent: {e}", exc_info=True)
        reply = fallback_conversational_response(user_message, history, is_admin_context=is_admin_context)
        history.append({"role": "user", "content": user_message})
        history.append({"role": "assistant", "content": reply})
        return reply, cid
