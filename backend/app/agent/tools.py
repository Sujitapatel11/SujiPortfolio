import logging
from typing import Optional
from pydantic import BaseModel, Field
from langchain_core.tools import tool
from app.database import SessionLocal
from app.models import Inquiry

logger = logging.getLogger("sujis_world.agent.tools")

class InquiryToolInput(BaseModel):
    name: str = Field(description="Full name of the visitor/client")
    email: str = Field(description="Email address of the visitor/client")
    project_type: str = Field(description="Type of project requested (e.g. Full-Stack Web App, AI Agent, MVP Building, Backend API)")
    budget: str = Field(description="Estimated budget range specified by the client (e.g. $5,000 - $10,000, $2,500, or TBD)")
    message: Optional[str] = Field(default="", description="Summary of project requirements or details discussed during chat")

@tool("save_client_inquiry", args_schema=InquiryToolInput)
def save_client_inquiry(name: str, email: str, project_type: str, budget: str, message: str = "") -> str:
    """
    Saves a qualified client lead / inquiry into Sujita's database.
    Call this tool once you have collected the client's name, email, project_type, and budget.
    """
    db = SessionLocal()
    try:
        inquiry = Inquiry(
            name=name,
            email=email,
            project_type=project_type,
            budget=budget,
            message=message or f"Inquiry submitted via 'Ask Suji' AI Intake Agent for {project_type}.",
            source="chat"
        )
        db.add(inquiry)
        db.commit()
        db.refresh(inquiry)
        logger.info(f"Successfully saved chat inquiry ID {inquiry.id} for {name} ({email})")
        return f"SUCCESS: Inquiry saved with ID {inquiry.id}. Sujita has received the details for {name} ({email})."
    except Exception as e:
        logger.error(f"Error saving inquiry tool: {e}")
        db.rollback()
        return f"ERROR: Failed to save inquiry due to database error: {str(e)}"
    finally:
        db.close()
