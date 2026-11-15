import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.config import CORS_ORIGINS
# Import every model module before create_all so SQLAlchemy knows the full schema.
from app import models as portfolio_models  # noqa: F401
from app.assistant import models as assistant_models  # noqa: F401
from app.routes import inquiries, chat, admin, assistant
from app.data.profile import PROFILE_DATA

logger = logging.getLogger("sujis_world.api")

# Create registered tables. Production schema changes should still use Alembic.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Suji's World Backend API",
    description="Backend API for 3D interactive portfolio, inquiries CRUD, and AI intake agent.",
    version="1.0.0",
)

# Explicit origins only. Wildcard + credentials is an unsafe CORS configuration.
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(inquiries.router)
app.include_router(chat.router)
app.include_router(admin.router)
app.include_router(assistant.router)


@app.get("/api/health")
def health_check():
    """Health check endpoint for Docker & monitoring."""
    return {"status": "ok", "app": "Suji's World API", "version": "1.0.0"}


@app.get("/api/profile")
def get_profile():
    """Single source of truth profile data endpoint."""
    return PROFILE_DATA
