from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.routes import inquiries, chat, admin
from app.data.profile import PROFILE_DATA

app = FastAPI(
    title="Suji's World Backend API",
    description="Backend API for interactive portfolio, inquiries CRUD, and AI intake agent.",
    version="1.0.0",
)

# Database schema is managed exclusively by Alembic migrations.
# Do not call Base.metadata.create_all() during application startup.
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


@app.get("/api/health")
def health_check():
    """Health check endpoint for Docker and monitoring."""
    return {"status": "ok", "app": "Suji's World API", "version": "1.0.0"}


@app.get("/api/profile")
def get_profile():
    """Single source of truth profile data endpoint."""
    return PROFILE_DATA


@app.on_event("startup")
def start_job_hunter_scheduler():
    from app.admin.job_scheduler import start_scheduler
    start_scheduler()


@app.on_event("shutdown")
def stop_job_hunter_scheduler():
    from app.admin.job_scheduler import stop_scheduler
    stop_scheduler()
