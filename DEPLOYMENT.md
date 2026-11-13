# Client deployment checklist

## Frontend — Vercel

- Import this GitHub repository: `Sujitapatel11/SujiPortfolio`.
- Set the project Root Directory to `frontend`.
- Framework: Vite; Install: `npm ci`; Build: `npm run build`; Output: `dist`.
- Set `VITE_API_URL` to the deployed Render API origin (for example, `https://<service>.onrender.com`, with no trailing slash).
- Add the variable to Production and Preview only when the matching API environment is available.
- Do not deploy the frontend as client-ready until the backend health endpoint and admin login have been smoke-tested.

## Backend — Render

Use the repository Blueprint (`render.yaml`) to create the API service. It uses the `backend` root directory and runs Alembic migrations before starting one Uvicorn process. Keep one instance while the in-process Job Hunter scheduler is enabled.

Required secrets/settings:
- `DATABASE_URL`: production PostgreSQL/Neon connection string.
- `ADMIN_USERNAME`: client-approved admin username.
- `ADMIN_PASSWORD_HASH`: bcrypt hash of a newly chosen client password; never use the example hash.
- `JWT_SECRET_KEY`: random secret of at least 32 characters.
- `CORS_ORIGINS`: exact public Vercel origin(s), comma-separated.
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`: required for LLM-powered chat; without either the app uses its limited fallback mode.
- `SERPAPI_API_KEY`: optional; enables Google Jobs search. Freelancer.com connector is attempted without this key.

Twilio variables are optional and only enable WhatsApp notifications. Do not set `JOB_HUNTER_SCHEDULER_ENABLED=true` until the service is on an always-on plan and provider access has been tested.

## Release gates

1. Inspect the existing Neon schema and `alembic_version` before applying migrations to any client database.
2. Verify `/api/health`, `/api/profile`, public inquiry submission, and admin login.
3. Verify unauthenticated inquiry reads return 401 and admin reads work with a valid token.
4. Run one controlled Job Hunter scan; confirm source links, deduplication, saved jobs, and proposal drafts.
5. Verify no application is submitted automatically.
6. Confirm logs contain no secrets or personal data before client handover.
