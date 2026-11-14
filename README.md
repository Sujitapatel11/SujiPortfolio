# Suji's World — AI Portfolio & Client Management

Suji's World is Sujita Patel's interactive portfolio and client-intake platform. It combines a React/Vite frontend with a FastAPI backend, an Ask Suji conversational assistant, project/profile information, client inquiries, and appointment requests.

## Core capabilities

- Interactive portfolio and project showcase.
- Ask Suji assistant with profile retrieval (RAG) and conversational responses.
- Client inquiry capture through the website and assistant.
- Appointment request capture and authenticated review.
- Private admin authentication using JWT.
- Client Management dashboard for inquiries and appointment status.
- Personal Operator foundation and local Windows companion in the development branch.

## Backend

The backend uses FastAPI, SQLAlchemy, PostgreSQL/pgvector, Pydantic, and optional OpenAI or Anthropic models.

### Admin endpoints

- `POST /admin/login` — authenticate the administrator.
- `GET /admin/me` — validate the admin session.
- `GET /admin/inquiries` — list client inquiries.
- `GET /admin/appointments` — list appointment requests.
- `PATCH /admin/appointments/{id}` — update appointment status.
- `POST /admin/knowledge/ingest` — refresh Ask Suji profile knowledge.

## Local development

Create `backend/.env` with the required values for your environment:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DB_NAME
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
ENVIRONMENT=development
ADMIN_USERNAME=suji
JWT_SECRET_KEY=replace-with-a-long-random-secret
ADMIN_PASSWORD_HASH=replace-with-a-bcrypt-hash
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

Run the API:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

Run the frontend in a separate terminal:

```powershell
cd frontend
npm install
npm run dev
```

## Personal Operator companion

The `companion/` directory contains the local Windows companion setup and pairing instructions. See [companion/README.md](companion/README.md). Pairing is intended to persist across restarts; website sign-in sessions can still expire independently.

## Database migration note

Historical Alembic migration files are retained. Existing deployments may already have applied them; do not delete migration history as part of feature removal. This cleanup removes the Job Hunter application code and API surface, not historical database migration records.

## License

MIT
