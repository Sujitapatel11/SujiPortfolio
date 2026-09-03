# 🌌 Suji's World — AI-Driven 3D Interactive Portfolio & Client Acquisition Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.109.0-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![LangChain](https://img.shields.io/badge/LangChain-0.1.0+-1C3C3C.svg?style=flat&logo=chainlink)](https://www.langchain.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1.svg?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB.svg?style=flat&logo=react)](https://reactjs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r168-black.svg?style=flat&logo=three.js)](https://threejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED.svg?style=flat&logo=docker)](https://www.docker.com/)

> **Suji's World** is an immersive 3D WebGL spatial portfolio and automated client intake system designed by **Sujita Patel**. Powered by a robust **FastAPI** backend and an autonomous **LangChain AI Agent ("Ask Suji")**, the platform bridges high-performance web engineering with intelligent, self-service client qualification and lead persistence.

---

## 🎯 What Is This?

**Suji's World** is not a static portfolio — it is a production-grade client intake engine wrapped in a spatial 3D experience. 

Visitors explore Sujita's technical universe across interactive 3D zones while engaging with **"Ask Suji"**, a conversational AI agent trained on Sujita's single source of truth profile. The AI agent seamlessly answers technical queries regarding past engineering projects, core skill sets, and services, while naturally qualifying incoming project inquiries and persisting actionable leads directly to a PostgreSQL database.

---

## ✨ Key Features Built So Far

### 🧠 "Ask Suji" LangChain AI Intake Agent (`/api/chat`)
- **Single Source of Truth Grounding**: Strictly answers visitor questions using facts from [`app/data/profile.py`](file:///c:/Users/sujit/OneDrive/Desktop/portfoliooo/backend/app/data/profile.py) (skills, featured projects, services offered, pricing tiers, and availability). Prevents hallucinated claims.
- **Autonomous Tool Calling (`save_client_inquiry`)**: Uses LangChain tool execution to capture lead details—*Name, Email, Project Type, and Budget*—and save them directly into the backend database with `source="chat"`.
- **Dual LLM Provider Support**: Dynamically detects and supports both **OpenAI** (`OPENAI_API_KEY`) and **Anthropic** (`ANTHROPIC_API_KEY`) models with seamless fallback.
- **Conversational Memory**: Maintains stateful chat histories per `conversation_id` across multi-turn interactions.
- **Graceful Fallback Mode**: Works out-of-the-box in local development environments even before API keys are configured.

### ⚡ FastAPI & PostgreSQL Backend Architecture
- **Inquiries CRUD API (`/api/inquiries`)**: Full Pydantic validation and SQLAlchemy ORM persistence for client leads submitted via site forms or chat.
- **Single Source Profile Endpoint (`/api/profile`)**: Exposes structured JSON profile data (skills, services, pricing, projects, and avatar links).
- **Dual Database Resilience**: Production-ready for **PostgreSQL 15**, with automatic local **SQLite** fallback for smooth offline development.
- **Containerized Stack**: Complete Docker & Docker Compose setup for instant deployment.

### 🔐 Private Admin Module (`/admin/*`)
- **Isolated 2D SPA**: Non-public administrative portal running under `/admin/*` without loading 3D WebGL assets.
- **JWT Authentication**: Secured with FastAPI `HTTPBearer` JWT token authorization and `passlib[bcrypt]` password hashing.
- **Client & Job Tracking**: Private management dashboard for reviewing client leads, job targets, and proposal drafts.
- **Alembic Migrations**: Fully integrated Alembic environment managing `jobs` and `proposals` relational tables.


---

## 🛠️ Tech Stack Overview

| Category | Technologies & Tools |
| :--- | :--- |
| **Backend Core** | Python 3.10+, FastAPI, Uvicorn, Pydantic v2 |
| **AI / Agentic Infrastructure** | LangChain, LangChain-OpenAI, LangChain-Anthropic, Custom Tools |
| **Database & ORM** | PostgreSQL 15, SQLAlchemy ORM, SQLite (Fallback) |
| **Frontend Framework** | React 18, Vite, JavaScript (ESNext) |
| **3D & Graphics Engine** | Three.js, React Three Fiber (`@react-three/fiber`), Drei, GSAP |
| **Styling & UI Theme** | Vanilla CSS3, Glassmorphism, Deep Ink Palette (`#0B0F14`) |
| **DevOps & Tooling** | Docker, Docker Compose, Git, `python-dotenv` |

---

## 🏗️ Architecture Overview

```mermaid
graph TD
    User([🌐 Web Visitor / Client]) -->|Interacts with 3D Spatial Canvas & HUD| Frontend[React + Vite + Three.js]
    Frontend -->|POST /api/chat| ChatRoute[FastAPI Chat Router /api/chat]
    Frontend -->|POST /api/inquiries| InquiryRoute[FastAPI Inquiries Router /api/inquiries]
    Frontend -->|GET /api/profile| ProfileRoute[FastAPI Profile Router /api/profile]
    
    ChatRoute --> AgentEngine["Ask Suji" LangChain AI Agent]
    ProfileRoute --> ProfileData[(profile.py - Single Source of Truth)]
    AgentEngine -->|Grounding Context| ProfileData
    
    AgentEngine -->|Executes save_client_inquiry Tool| Tool[Inquiry Database Persistence Tool]
    InquiryRoute -->|Validates InquiryCreate Schema| Tool
    
    Tool -->|SQLAlchemy ORM| DB[(PostgreSQL 15 / SQLite Database)]
```

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & `npm`
- **Docker & Docker Compose** (Optional, for containerized database stack)

---

### 1. Backend Setup

#### Clone & Navigate
```bash
git clone https://github.com/sujita/portfoliooo.git
cd portfoliooo/backend
```

#### Environment Configuration (`.env`)
Create a `.env` file in the `backend/` directory (see `.env.example`):
```env
DATABASE_URL=postgresql://suji_user:suji_password@localhost:5432/sujis_world_db
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ENVIRONMENT=development
PORT=8000
```

#### Option A: Run via Docker Compose (Recommended)
```bash
docker-compose up --build
```
- **API Base URL**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`

#### Option B: Run via Python Virtual Environment
```bash
python -m venv venv

# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On Linux / macOS:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

---

### 2. Testing API Endpoints (`curl`)

#### Health Check
```bash
curl -X GET "http://localhost:8000/api/health"
```

#### Get Profile Facts
```bash
curl -X GET "http://localhost:8000/api/profile"
```

#### Talk to "Ask Suji" AI Agent (`POST /api/chat`)
```bash
curl -X POST "http://localhost:8000/api/chat" \
     -H "Content-Type: application/json" \
     -d '{
       "message": "What projects has Sujita built and what services does she offer?",
       "conversation_id": "session_001"
     }'
```

#### Qualify Lead via Chat & Save to Database
```bash
curl -X POST "http://localhost:8000/api/chat" \
     -H "Content-Type: application/json" \
     -d '{
       "message": "My name is Alex, email alex@example.com. I want a Full-Stack Web App with a budget of $5,000.",
       "conversation_id": "session_001"
     }'
```

#### Retrieve Inquiries (`GET /api/inquiries`)
```bash
curl -X GET "http://localhost:8000/api/inquiries"
```

---

## 🔮 Upcoming Frontend 3D Roadmap

The frontend (currently under active development in `/frontend`) introduces a spatial 3D experience:

- 🌌 **6 Guided Spatial Zones**:
  1. **Origin Zone**: Hero overview featuring the real photo-based **Avatar Core** (built with MediaPipe Tasks Vision face-landmark detection, cool-tone shader vignette, and 3-state crossfade transitions: *Solid Photo*, *Glowing Cyan Wireframe*, and *Violet Digital Mesh*).
  2. **Workshop Zone**: Full-Stack Web Apps showcase & project deep-dives (**SoulCare** & **AIEC**) with warm amber work-light (`#f59e0b`).
  3. **AI Lab Zone**: LangChain AI agent architecture, interactive prompt playground, and live tool invocation visualizer with electric blue/violet glow (`#8b5cf6`).
  4. **Gallery Zone**: 3D interactive exhibit of WebGL graphics, materials & visual shaders with studio showcase lighting (`#60a5fa`).
  5. **Office Zone**: Services offered, deliverables & pricing cards with calm professional emerald lighting (`#10b981`).
  6. **Contact Zone**: Direct client intake terminal & inquiry dispatch form with neon pink/magenta portal lighting (`#ec4899`).
- 🛣️ **Guided Journey Navigation Controller**: Fixed spatial camera exploration driven by **GSAP** (`power3.inOut`). Supports desktop mouse wheel scrolling, mobile touch swiping, keyboard arrow navigation, and dot HUD clicks with zero free-roam drift and soft spatial reveal pulses (`isTransitioning`).
- 📍 **Vertical Progress Indicator HUD**: Fixed side trail of glowing dots displaying active zone highlights and hover tooltips (`01. Origin` through `06. Contact`).

---

## 📸 Preview & Screenshots

*Interface screenshots and spatial 3D canvas recordings will be added here upon full frontend release.*

```
+-----------------------------------------------------------------------------------+
|  🌌 SUJI'S WORLD — 3D SPATIAL CANVAS                                             |
|                                                                                   |
|         [ Origin ] ---------> [ Workshop ] ---------> [ AI Lab ]                 |
|                                                                                   |
|  +---------------------------+  +----------------------------------------------+  |
|  |  "Ask Suji" AI Assistant  |  |  Interactive 3D Scene (React Three Fiber)    |  |
|  |  Chat Drawer (Active)     |  |  Deep Ink Glassmorphism Theme                |  |
|  +---------------------------+  +----------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 👩‍💻 About the Developer

**Sujita Patel**  
*B.Tech in Computer Science and Engineering (CSE)*  
**Specialization**: Full-Stack Web Engineering, High-Performance FastAPI Backends, and Applied AI/ML Systems.

### Featured Projects
- **SoulCare**: Private journaling platform featuring AI mood insights and an anonymous community with a trust-based identity reveal mechanism. *(Built with React, FastAPI, Python, AI/LLM, PostgreSQL)*.
- **AIEC (Education Consultancy Platform)**: Comprehensive education consultancy platform equipped with an administrative panel, student inquiry lifecycle management, counsellor-student matching engine, document tracking, and automated university recommendations. *(Built with Python, FastAPI, React, PostgreSQL)*.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
