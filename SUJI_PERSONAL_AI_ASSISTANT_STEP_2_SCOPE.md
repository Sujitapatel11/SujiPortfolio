# Suji Founder Assistant — Step 2 Scope and Integration Decision

**Date:** 2026-11-14  
**Repository:** `Sujitapatel11/SujiPortfolio`  
**Integration branch:** `feat/suji-founder-assistant-integration`  
**Base:** current `main` (starting from the current main line; no production changes)  
**Audit reference:** `audit/suji-personal-ai-assistant`

## 1. Product decision

Build a **private, founder-focused personal AI operator** for one owner. This is not a public portfolio chatbot and not a general-purpose autonomous agent.

The assistant should help the owner run personal projects and founder workflows, with voice-first interaction and typed fallback. Job Hunter remains in scope as a career/productivity capability. The existing Job Hunter must be preserved; it must not be deleted to make room for the assistant.

## 2. Initial release scope

### P0 — Required foundation
- Private authenticated assistant route; no assistant orb/pairing surface on the public portfolio.
- Secure owner-only sessions and conversation history.
- One consistent frontend/backend/Windows-companion API contract.
- Explicit tool registry and deterministic allowlist.
- Proposal → exact review → explicit approval → one-time execution → verifiable result.
- Audit events for proposal, approval, rejection, execution, failure and cancellation.
- Clear refusal/clarification when a command is ambiguous or unsupported.
- English, Hindi and Hinglish input support; typed fallback always available.

### P1 — Founder and career workflows
- Job Hunter search and shortlist, preserving existing providers and workflows where functional.
- Job description analysis and application-material drafting for owner review.
- Project/task summaries, planning and progress tracking.
- Research and document drafting.
- Browser search and approved URL opening.
- Windows app launching from a small, explicit allowlist, verified on the owner's machine.

### P2 — Later, only after safe execution is stable
- More integrations and founder dashboards.
- Calendar/task integrations where account access and permissions are explicitly configured.
- Voice responses and improved conversational context.
- Additional productivity automations with transparent schedules and opt-in controls.

## 3. Explicit non-goals for initial release

- No autonomous job applications or submissions.
- No automatic WhatsApp, email, social or other messages.
- No purchases, payments, money transfers, account changes or irreversible file operations.
- No arbitrary shell/PowerShell execution.
- No unrestricted file-system access.
- No always-on microphone or wake-word listener in the first release.
- No public visitor access to the private operator.

Any future consequential external action must require approval of the exact action and payload immediately before execution.

## 4. Integration strategy

### Chosen base: current `main`

Create and work on `feat/suji-founder-assistant-integration` from current `main`. This preserves the latest portfolio and Job Hunter baseline instead of using the assistant branch that deliberately removes Job Hunter.

### Do not merge PR #11 wholesale

PR #11 (`feat/personal-assistant-foundation` → `main`) is titled **"Remove Job Hunter and build Personal Operator foundation"** and explicitly removes job-search/proposal workflows. It is open and currently reported non-mergeable. It must not be merged as-is because that conflicts with the agreed product scope.

### Selective porting only

Port assistant capabilities in small reviewed units from `feat/personal-assistant-foundation`:
1. Assistant data models and migration, after checking migration history against main.
2. Planner and schemas.
3. Policy and tool registry.
4. Authenticated routes and tests.
5. Private frontend route and UI, rewritten to fit the current admin/auth structure.
6. Windows companion and one canonical API client, after protocol alignment.

Do not copy the assistant branch's full `backend/app/main.py`, `backend/app/routes/admin.py`, `frontend/src/admin/Dashboard.jsx`, `frontend/src/App.jsx`, or `backend/app/models.py` wholesale. Those files contain unrelated changes/removals and have integration risk.

### Preserve Job Hunter

Keep the current `main` Job Hunter UI, connectors, scheduler, orchestration, proposal drafting and tests as the regression baseline. The integration must demonstrate these still work before any PR is considered.

### Branches and release boundaries
- `main`: untouched until a reviewed PR is accepted.
- `feat/personal-assistant-foundation`: source reference only; do not merge wholesale.
- `feat/operator-whatsapp-linkedin-search`: source reference for companion work; do not merge wholesale.
- `audit/suji-personal-ai-assistant`: audit/report only.
- `feat/suji-founder-assistant-integration`: all Step 3+ implementation work.

## 5. Step 3 implementation order

1. Establish regression baseline on this branch: inspect current main entrypoints, auth, DB models/migrations, Job Hunter endpoints and frontend routes.
2. Add assistant models and a migration that follows the actual current Alembic head; verify upgrade/downgrade on disposable SQLite/Postgres test databases.
3. Mount assistant router in app startup with exact production CORS/config and tests that inspect the OpenAPI routes.
4. Move private operator behind admin authentication and verify unauthenticated requests are rejected.
5. Normalize companion route contract and secure pairing.
6. Implement a device dispatch/execution layer only after payload binding, expiry, one-time nonce, owner/device binding and execution audit are tested.
7. Add voice UX and tool capabilities after typed end-to-end flow works.

## 6. Acceptance gates

- Job Hunter routes, UI, provider adapters and tests remain present and pass.
- Assistant endpoints appear in OpenAPI and require authenticated owner access.
- Public route does not render private assistant controls.
- Assistant proposals are inert until exact approval.
- Approval binds to a canonical payload hash, owner, device, expiry and one-time execution token.
- Rejection, expiry, altered payload and replay cannot execute.
- Each enabled device command is tested on real Windows hardware.
- Voice and spoken feedback are tested in supported browsers; typed fallback remains usable.
- No production deployment until the owner approves a release after staging verification.

## 7. Known constraints and verification facts

- GitHub Actions run #18 for assistant-foundation commit `c6862b87162f04e8be263deec5856a85ace3efd0` passed frontend build, backend checks and companion unit tests. This does not verify production runtime or actual Windows app launch.
- Render currently lists an `aiDepressionProject` service connected to a different repository, not this portfolio repository. A Render Postgres instance exists but its live schema could not be queried because external connections are blocked by an empty IP allowlist.
- Do not change Render networking or deploy as part of Step 2.

## Decision summary

**Preserve Job Hunter. Use current main as the integration base. Selectively port the assistant foundation. Keep the operator private. Build execution only after its approval and device-security boundary is designed and tested.**
