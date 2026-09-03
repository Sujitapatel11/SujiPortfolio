from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routes import inquiries, chat, admin
from app.data.profile import PROFILE_DATA

# Create database tables automatically if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Suji's World Backend API",
    description="Backend API for 3D interactive portfolio, inquiries CRUD, and AI intake agent.",
    version="1.0.0"
)

# CORS Middleware setup
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(inquiries.router)
app.include_router(chat.router)
app.include_router(admin.router)

@app.get("/api/health")
def health_check():
    """Health check endpoint for Docker & monitoring."""
    return {"status": "ok", "app": "Suji's World API", "version": "1.0.0"}

@app.get("/api/profile")
def get_profile():
    """Single source of truth profile data endpoint."""
    return PROFILE_DATA
