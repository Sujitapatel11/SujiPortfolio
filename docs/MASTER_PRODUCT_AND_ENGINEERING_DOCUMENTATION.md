# SujiPortfolio — Master Product & Engineering Reference

**Owner:** Sujita Patel  
**Reference date:** 26 November 2026  
**Portfolio repository:** https://github.com/SujitaPatel11/SujiPortfolio

> Accuracy rule: A file, model, route, mock-up or preview URL is not proof of a complete production feature. This reference separates repository evidence from partial integrations, retired areas, future work and runtime checks that remain outstanding.

## 1. Portfolio overview

SujiPortfolio is a public engineering portfolio paired with a private owner workspace. It presents backend, full-stack and applied-AI work while providing visitor inquiry/chat intake and authenticated operational tools.

The current repository contains:
- A React + Vite public frontend with shared portfolio data, section components, project previews and responsive navigation.
- A FastAPI backend for profile data, conversational intake, inquiries, admin operations and the personal-assistant API.
- PostgreSQL persistence through SQLAlchemy and Alembic migrations.
- A private admin interface for owner-only workflows.
- A constrained assistant system with device registration, approval records and an execution queue.
- Separate Windows and Android companion clients. These are device executors, not separate AI brains.

**Inspected main snapshot:** 048f6ba5a806f28e384b43ee1fa22e4ef69d5aa1 (26 November 2026).  
**Primary source files:** frontend/src/data/portfolio.js, backend/app/main.py, DEPLOYMENT.md, companion/README.md, android-companion/README.md and docs/assistant/SUJI_PERSONAL_AI_OPERATOR_PRODUCT_CONTRACT.md.

## 2. Featured engineering projects

### 2.1 SoulCare — social and creator platform

**Positioning:** SoulCare is a social entertainment and creator platform with community and peer-support foundations. It is **not a journaling app**.

Repository: https://github.com/SujitaPatel11/aiDepressionProject (private)  
Preview: https://soul-care-one.vercel.app  
Repository stack: React 18, Vite, React Router, Tailwind CSS, Django, Django REST Framework, Django Channels, Daphne/ASGI, PostgreSQL, Redis and optional Cloudinary / Cloudflare R2 / LiveKit integrations. Exact deployment configuration is environment-dependent.

**Product areas represented in the repository**
- Identity, public profiles and creator profiles.
- Creator publishing, posts and creator discovery.
- Community/feed functionality and peer connections/support.
- Direct chat and notifications, including WebSocket infrastructure.
- Media upload, delivery and access-control paths.
- SoulTube synchronized watch-together rooms, room chat and playback state.
- Creator Live session models/APIs and LiveKit token integration.
- SoulWorld profile progression and cosmetic/unlock concepts.
- A sleep-tracking domain.

**Critical boundary — journaling and insights:** the journal and insights API handlers in the audited main branch are retired and return HTTP 410 Gone. Legacy app folders, models or route registrations do not make these active features. Do not advertise private journaling, AI journal analysis or mood insights as shipped. Re-enabling them requires an explicit product decision, implementation and privacy/security review.

**Status distinctions**
- **Implemented in source:** relevant models, routes, views or frontend modules exist; this does not guarantee every user journey has passed end-to-end QA.
- **Partial / integration-dependent:** media requires durable storage configuration; Creator Live requires production provider and frontend validation; monetization data structures do not mean a live payout system.
- **Not verified as shipped:** live creator payouts, reliable revenue attribution and settlement, complete user-facing account deletion/export, and a native SoulCare Android application.
- **Release readiness:** SoulCare remains under development. Deployment, permissions, media persistence, WebSockets, backups/restores, moderation and security require end-to-end validation.

**Reference files in the SoulCare repository:** README.md, docs/SOULCARE_COMPLETE_DOCUMENTATION.md, PRODUCT_REQUIREMENTS.md, docs/architecture/SOULCARE_SYSTEM_ARCHITECTURE.md, docs/architecture/SOULCARE_DATABASE_DESIGN.md, docs/architecture/SOULCARE_SECURITY_REVIEW.md, backend/config/urls.py, backend/apps/journal/views.py and backend/apps/insights/views.py.

### 2.2 UrmiNexus — multi-tenant study-abroad SaaS

**Product relationship:** UrmiNexus is the multi-tenant SaaS platform. **AIEC (Aradhya International Education Consultancy, Birgunj, Nepal) is its initial consultancy tenant.** AIEC is not a separate, unrelated product.

Repository: https://github.com/SujitaPatel11/aiec  
Preview: https://aiec-three.vercel.app  
Repository stack: React, Vite, Tailwind CSS, Django, Django REST Framework and PostgreSQL. OpenAI is used for AI-assisted recommendations with a rule-based fallback; Cloudinary is present for media integrations.

**Repository-backed workflow areas**
- Tenant/consultancy ownership and consultancy memberships with owner, admin and staff roles.
- Student intake questionnaire and country/course recommendation workflow.
- Lead CRM, assignment, status tracking, notes, activity and follow-up.
- Counselling notes, staff tasks and appointments.
- Lead-to-student conversion, student records and student portal.
- University applications, country-specific workflow steps, offers and application timelines.
- Student document upload, verification and application document checklists.
- WhatsApp inquiry entry points and video-testimonial endpoints.

**Status boundary:** a live preview URL does not prove every tenancy boundary, staff permission, workflow, integration or production data path has passed end-to-end security review. Treat UrmiNexus/AIEC as a live preview until those checks are evidenced.

**Reference files in the AIEC repository:** README.md, backend/api/models.py, backend/api/tenancy.py, backend/api/urls.py, backend/api/views.py and backend/test_phase41_consultancy_ownership.py.

### 2.3 SujiPortfolio — portfolio and owner operations

This repository is itself a featured engineering project. It combines public portfolio delivery, visitor intake, owner administration and a constrained personal-operator foundation.

- **Frontend:** React + Vite.
- **Backend:** FastAPI + Uvicorn.
- **Persistence:** PostgreSQL, SQLAlchemy and Alembic; SQLite support exists for local/test contexts where configured.
- **AI:** LangChain-based agent/retrieval modules exist in the repository. Live provider/index readiness must be verified from runtime diagnostics; source code or static UI labels are not proof.
- **API surface:** inquiries, chat, admin and assistant routers, plus /api/health and /api/profile.
- **Health semantics:** /api/health is process-level liveness, not a complete database, AI-provider, vector-index or email readiness check.
- **Schema management:** database changes are migration-managed; do not describe app startup as creating the entire database schema.

## 3. Hey Suji — assistant and device companions

The intended architecture uses one FastAPI assistant backend as the shared brain, with the portfolio UI and paired Windows/Android companions acting as activation or execution surfaces.

**Repository-backed foundation**
- Assistant session/message APIs, policy/planner code and a tool registry.
- Device registration/pairing, action approval and an execution queue.
- Windows companion with a loopback-only local service and OS credential storage.
- Android companion with device-bound credential storage, a visible foreground receiver and notification-tap execution.

**Documented safety limits**
- The Windows companion uses an allowlist and does not provide arbitrary shell/PowerShell execution.
- Android actions require an owner-approved task and a deliberate notification tap; Android background execution restrictions are respected.
- The clients do not read passwords/cookies or bypass CAPTCHA/OTP.
- Sending messages, submitting applications/forms, purchases/payments and other consequential external actions require explicit owner approval or remain unsupported. Final submission is not automatic.
- Voice capture is explicit. Always-on wake-word/background listening is not an available shipped capability in the inspected companion documentation.
- CI does not replace pairing and execution tests on the actual Windows laptop and Android phone.

**Future intent is not a release claim:** multi-step workflows, richer browser automation, scoped file work, job research and an opt-in wake phrase are roadmap ideas in the product contract. Do not claim they are fully implemented until code, test evidence and physical-device/runtime checks support that claim.

**Reference files:** docs/assistant/SUJI_PERSONAL_AI_OPERATOR_PRODUCT_CONTRACT.md, SUJI_PERSONAL_AI_ASSISTANT_STEP_2_SCOPE.md, SUJI_PERSONAL_AI_ASSISTANT_STEP_3_FOUNDATION_REPORT.md, SUJI_PERSONAL_AI_ASSISTANT_STEP_4_EXECUTION_DESIGN.md, companion/README.md and android-companion/README.md.

## 4. Design and documentation standard

The approved visual direction is premium, minimal and professional, using restrained muted plum/lavender accents. Avoid neon pink, loud gradients, inconsistent card treatments and decorative borders that do not clarify hierarchy.

For portfolio UI and project documents:
- Use one centered content grid and consistent page/section gutters.
- Align headings, paragraph edges, cards, tables and metadata to the same grid.
- Use a clear type scale and consistent vertical rhythm.
- Keep card padding, border weight, radius and row spacing consistent.
- Use subtle neutral borders and restrained accent colour.
- Test light and dark modes, desktop/tablet/mobile widths, keyboard focus, contrast, clipping and horizontal overflow.
- Do not make mock previews look like verified live workflows.

For technical documents:
- Put an executive overview and source snapshot first.
- Separate architecture, project scope, feature status, integrations, security boundaries, roadmap and acceptance criteria.
- Date audit claims and identify the branch/commit inspected.
- Label each capability as implemented in source, partial, retired, planned or unverified.
- Link to canonical repository paths instead of machine-specific file URLs.

## 5. Operational and release caveats

A source audit and successful build are not the same as a verified production release. Keep these items visible until closed with evidence:

1. **Backend branch reconciliation:** the operations audit recorded a Render deployment branch with significant divergence from GitHub main. Do not switch the live Render service directly to main; compare and reconcile live-only work, routes, policies and migrations first.
2. **Database continuity:** the 25 November operations note recorded the Render Free PostgreSQL instance with an expiry of 11 December 2026. A verified export and restore test were still outstanding in that note. Recheck the current database state before relying on this dated observation.
3. **Runtime checks:** verify API health, actual database connectivity, inquiry persistence, chat/provider status, admin auth, WebSockets, assistant approval/execution and companion pairing against the target environment.
4. **Health semantics:** /api/health reports process liveness only in the audited main code; do not label it full system readiness.
5. **Admin security:** the 25 November audit flagged localStorage-based admin JWT handling as a hardening item. Recheck current main and complete a session/CSRF review before claiming hardened authentication.
6. **Frontend visual QA:** automated build/CI cannot prove pixel-level layout correctness; inspect the rendered site at representative viewport sizes.
7. **Physical-device QA:** verify Windows and Android pairing, approval, execution, revocation and result reporting on actual devices.

These are dated operational findings, not assertions that every item remains unchanged today. Re-audit before deployment.

## 6. Recommended engineering sequence

1. Keep portfolio UI and copy truthful to the three featured repositories.
2. Finish visual QA of the premium muted-purple design at desktop, tablet and mobile sizes.
3. Reconcile the live backend branch with main without discarding deployed-only assistant functionality.
4. Back up the database and test restoration before the recorded Free-plan expiry; confirm actual current expiry/status in the hosting dashboard.
5. Verify backend readiness beyond process liveness: database query, configured AI/vector provider, inquiry persistence and required integrations.
6. Harden admin authentication and test negative authorization paths.
7. Complete SoulCare media, live, moderation, privacy and release checks; do not reactivate retired Journal/Insights without a deliberate product/security decision.
8. Complete UrmiNexus tenant-isolation, permission and end-to-end workflow tests.
9. Run real-device Hey Suji pairing and execution tests; then decide which roadmap capabilities are safe to build next.

## 7. Release acceptance checklist

- [ ] Project descriptions match the current source repositories.
- [ ] SoulCare is not described as a journaling app; Journal and Insights are marked retired.
- [ ] UrmiNexus is named as the platform and AIEC as its initial tenant.
- [ ] Every status label has source or runtime evidence.
- [ ] Portfolio navigation points to real rendered sections.
- [ ] Project links, preview links and resume link resolve as intended.
- [ ] Light/dark appearance and responsive layouts pass visual QA.
- [ ] Inquiry submission shows success only after persistence succeeds.
- [ ] Admin APIs deny unauthenticated access and enforce owner permissions.
- [ ] Backend readiness checks verify dependencies rather than only process liveness.
- [ ] Migrations are rehearsed on a disposable database and restore is tested.
- [ ] SoulCare media, WebSockets, live sessions, moderation and privacy controls pass end-to-end checks.
- [ ] UrmiNexus tenancy and student-record isolation pass negative permission tests.
- [ ] Hey Suji approval, replay protection, revocation and actual-device tests pass.
- [ ] No consequential external action is submitted without explicit approval.
- [ ] Logs and public responses contain no secrets or private user records.

## 8. Source-of-truth links

- [SujiPortfolio repository](https://github.com/SujitaPatel11/SujiPortfolio)
- [SujiPortfolio portfolio data](https://github.com/SujitaPatel11/SujiPortfolio/blob/main/frontend/src/data/portfolio.js)
- [SujiPortfolio FastAPI entry point](https://github.com/SujitaPatel11/SujiPortfolio/blob/main/backend/app/main.py)
- [SujiPortfolio deployment checklist](https://github.com/SujitaPatel11/SujiPortfolio/blob/main/DEPLOYMENT.md)
- [SoulCare repository](https://github.com/SujitaPatel11/aiDepressionProject)
- [SoulCare master technical documentation](https://github.com/SujitaPatel11/aiDepressionProject/blob/main/docs/SOULCARE_COMPLETE_DOCUMENTATION.md)
- [UrmiNexus / AIEC repository](https://github.com/SujitaPatel11/aiec)
- [UrmiNexus / AIEC README](https://github.com/SujitaPatel11/aiec/blob/main/README.md)

**Maintenance:** update this document when product scope or repository source changes. On each revision, record date, branch, commit SHA and the tests/runtime checks actually performed.
