# SujiPortfolio

**Sujita Patel — Software Engineer · Backend Development · Applied AI**

A backend-first engineering portfolio and private owner workspace. The public site presents selected projects and engineering work; the FastAPI service supports profile data, visitor inquiries, conversational intake, authenticated administration and a constrained personal-assistant foundation.

- **Frontend:** React, Vite, JavaScript
- **Backend:** FastAPI, Uvicorn
- **Data:** PostgreSQL, SQLAlchemy, Alembic
- **AI:** LangChain-based agent/retrieval modules; live provider and vector-index readiness must be verified in the target environment
- **Device companions:** Windows local companion and a native Android executor connected to the shared assistant backend

## Featured projects

### SoulCare — social and creator platform

SoulCare is a social entertainment and creator platform with community and peer-support foundations. It is **not a journaling app**. The repository contains creator profiles and publishing, community/feed, peer connections, direct chat, notifications, SoulTube synchronized watch rooms, Creator Live integration components, SoulWorld and a sleep domain.

Journal and Insights handlers in the audited repository return HTTP 410 Gone. Do not market journaling or AI journal insights as active features. Media persistence, creator live configuration, creator payouts and complete privacy/lifecycle workflows require further validation. SoulCare remains under active development.

- Repository: [aiDepressionProject](https://github.com/SujitaPatel11/aiDepressionProject) (private)
- Preview: [soul-care-one.vercel.app](https://soul-care-one.vercel.app)
- Master product reference: [SoulCare complete documentation](https://github.com/SujitaPatel11/aiDepressionProject/blob/main/docs/SOULCARE_COMPLETE_DOCUMENTATION.md)

### UrmiNexus — multi-tenant study-abroad SaaS

UrmiNexus is the multi-tenant platform. **AIEC (Aradhya International Education Consultancy, Birgunj, Nepal) is its initial consultancy tenant**, not a separate unrelated product.

The repository contains tenant/membership foundations, student questionnaires, recommendation workflows, lead CRM, counselling notes, tasks, appointments, student enrolment/portal, university applications, offers, timelines, document workflows and inquiry integrations. AI recommendations have a rule-based fallback. The published site is a preview; a URL alone does not prove every tenant permission and workflow has passed production QA.

- Repository: [aiec](https://github.com/SujitaPatel11/aiec)
- Preview: [aiec-three.vercel.app](https://aiec-three.vercel.app)

### SujiPortfolio — portfolio and AI-assisted intake

This repository is itself a featured project: a React/Vite portfolio, FastAPI backend, profile and inquiry APIs, conversational intake, private admin workspace, PostgreSQL persistence and Alembic migrations. The assistant/device work is a constrained foundation; future product-contract ideas are not automatically shipped functionality.

## Repository map

- frontend/ — React/Vite public portfolio, project data, sections, previews and admin UI.
- backend/ — FastAPI application, API routes, assistant modules, persistence and migrations.
- companion/ — Windows local companion.
- android-companion/ — native Android device executor.
- docs/ — technical and product documentation.
- DEPLOYMENT.md — hosting configuration and release checklist.

## Hey Suji and device boundaries

The assistant uses a shared FastAPI backend. Windows and Android companions are device executors, not independent AI systems. Device pairing, command allowlists, explicit approval, device revocation and execution reporting are core safeguards.

The Windows service is loopback-bound and does not support arbitrary shell execution. Android actions require owner approval and a deliberate notification tap. The inspected companion documentation does not describe an always-on wake word. Sending messages, submitting applications/forms, payments and other consequential actions must not happen without explicit owner approval. A CI build is not a substitute for real-device testing.

See:
- [Assistant product contract](docs/assistant/SUJI_PERSONAL_AI_OPERATOR_PRODUCT_CONTRACT.md)
- [Windows companion setup](companion/README.md)
- [Android companion setup](android-companion/README.md)

## Local development

Exact commands and environment variables may change; use the current example files and deployment docs as the source of truth. Never commit real credentials.

**Frontend:** change to frontend/, run npm ci, then npm run dev.

**Backend:** change to backend/, create and activate a Python virtual environment, install backend/requirements.txt, configure backend/.env using the documented example values, apply Alembic migrations, then start Uvicorn using the command and settings documented for the current environment.

Do not assume a local SQLite setup is equivalent to production PostgreSQL.

## Verification and release discipline

- Frontend build and CI do not prove browser-level visual correctness.
- /api/health is a process liveness check in the audited code, not a complete database/AI/provider readiness probe.
- Verify inquiry persistence, admin authentication, authorization failures and assistant approvals against a test environment.
- Reconcile the live backend branch with main before changing production branch configuration; do not discard deployed-only code or migrations.
- Back up the database and rehearse restore before any hosting-plan expiry or migration.
- Test Windows and Android pairing/execution on actual devices.
- Do not claim a feature is production-ready unless its release checks have passed.

## Master documentation

See [MASTER_PRODUCT_AND_ENGINEERING_DOCUMENTATION.md](docs/MASTER_PRODUCT_AND_ENGINEERING_DOCUMENTATION.md) for the consolidated product definitions, repository architecture, implemented/partial/retired/planned boundaries, operational caveats, visual standards and release acceptance checklist.

## Maintainer

**Sujita Patel**  
B.Tech — Computer Science and Engineering  
[GitHub](https://github.com/SujitaPatel11) · [LinkedIn](https://www.linkedin.com/in/suji57/)
