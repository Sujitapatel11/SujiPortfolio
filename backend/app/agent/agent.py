import os
import uuid
import logging
import re
from typing import Dict, List, Tuple, Optional
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from app.database import SessionLocal
from app.data.profile import PROFILE_DATA
from app.agent.tools import save_client_inquiry
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

def fallback_conversational_response(user_msg: str, history: List[Dict[str, str]]) -> str:
    """
    Intelligent fallback intake responder when no LLM key is set in .env.
    NOTE: The fallback engine is a safety net when no LLM API keys (OpenAI/Anthropic) are configured.
    It uses rule-based string matching and does NOT have vector RAG or dynamic persona behavior.
    This is expected behavior for zero-cost offline development fallback.
    """
    msg_lower = user_msg.lower()

    # Lead capture detection (if email is present)
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', user_msg)
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
            "Would you like to discuss building a project with similar features?"
        )

    # Check for services or pricing query
    if any(k in msg_lower for k in ["service", "pricing", "cost", "price", "rate", "budget", "mvp", "backend"]):
        return (
            "Sujita offers 4 main services:\n"
            "- **Full-Stack Web Apps**\n"
            "- **Backend/API Development**\n"
            "- **SaaS/MVP Building**\n"
            "- **AI/ML Integration**\n\n"
            "Pricing ranges from Starter MVPs ($2,500 - $5,000) to Growth platforms ($5,000 - $10,000) and Enterprise systems ($10,000+). "
            "What kind of project are you planning, and what is your estimated budget?"
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
        "and AI agents (like SoulCare & AIEC). Are you looking to build a project or consult with Sujita? "
        "Feel free to share your name, email, project type, and budget to get started!"
    )

def run_agent_message(
    user_message: str,
    conversation_id: Optional[str] = None,
    db: Optional[Session] = None
) -> Tuple[str, str]:
    """
    Process a user message through the RAG + Persona LangChain agent, maintaining chat history.
    1. Retrieves relevant knowledge_chunks using pgvector similarity search.
    2. Builds dynamic system prompt with Jarvis-inspired persona + retrieved chunks.
    3. Invokes LLM agent with tools (save_client_inquiry).
    Returns (reply_text, conversation_id).
    """
    cid = conversation_id or str(uuid.uuid4())
    if cid not in CONVERSATION_STORE:
        CONVERSATION_STORE[cid] = []

    history = CONVERSATION_STORE[cid]
    llm = get_llm()

    if llm is None:
        reply = fallback_conversational_response(user_message, history)
        history.append({"role": "user", "content": user_message})
        history.append({"role": "assistant", "content": reply})
        return reply, cid

    try:
        # Step 1 & 2: RAG retrieval & dynamic prompt construction
        retrieved_chunks = retrieve_relevant_chunks(query=user_message, top_k=5, db=db)
        system_prompt = build_system_prompt(retrieved_chunks=retrieved_chunks, persona=SUJI_PERSONA)

        # Step 3: Agent initialization with LangChain
        from langchain.agents import create_agent
        from langchain_core.messages import HumanMessage, AIMessage

        tools = [save_client_inquiry]
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
            reply = "I'm here to help answer questions about Sujita's services and past projects!"

        history.append({"role": "user", "content": user_message})
        history.append({"role": "assistant", "content": reply})

        return reply, cid

    except Exception as e:
        logger.error(f"Error executing RAG LangChain agent: {e}", exc_info=True)
        reply = fallback_conversational_response(user_message, history)
        history.append({"role": "user", "content": user_message})
        history.append({"role": "assistant", "content": reply})
        return reply, cid
