# Hey Suji Autonomous Work Engine — Implementation Contract

**Target branch:** `feat/suji-assistant-execution-engine`  
**Status:** implementation plan; not a claim that autonomous browser execution is already available.

## Product goal

Hey Suji is a user-directed desktop work agent. The user gives one natural-language goal (voice or text); the agent plans and carries out a multi-step workflow across the websites and desktop applications the user names; it reports evidence and a finished result. The user should not have to micromanage each navigation, search, extraction, comparison, or drafting step.

Example: “Find suitable freelance jobs on Fiverr, compare them with my real skills, prepare tailored proposals, and show me the applications ready for my final review.”

The same workflow engine must work across supported sites, not be hard-coded to Fiverr.

## Non-negotiable behavior

- One instruction starts a workflow; the agent owns the intermediate steps.
- Voice is conversational: speech is transcribed and submitted automatically after end-of-turn detection; the assistant replies with audio. No manual Send button for voice.
- Text input remains as a fallback.
- Workflow state, step results, browser context, and conversation history persist across turns and refreshes.
- The agent reports what it actually did, with links/evidence; it must never claim a task succeeded without a verified result.
- The user can pause, resume, cancel, or interrupt a workflow.
- Site-specific adapters are optional. The core browser worker uses generic navigation, accessibility/DOM inspection, click, type, scroll, wait, and extraction primitives.
- Sites that prohibit automation, block access, or require CAPTCHA/2FA must be handled through user-assisted handoff; no bypassing access controls, CAPTCHA, rate limits, or platform restrictions.
- Credentials and cookies remain in the user's local browser profile / OS credential store. They are never sent to the model or logged.
- No automatic final submission of applications, messages, purchases, payments, account changes, or destructive actions. Prepare and validate them; require a clear final user confirmation at the point of submission.

## Existing baseline (verified in repository)

- FastAPI assistant sessions, messages, action proposals, approvals, audit records, paired-device registry, and command polling already exist.
- Current planner proposes only one action at a time and only supports `browser.open_url` and a small desktop-app allowlist.
- Current Windows companion opens a URL using the default browser; it does not yet control a browser DOM or inspect pages.
- Existing Job Hunter has a manual-paste flow and generic proposal drafting. The current orchestrator registers Freelancer.com and a search provider by default; there is no production Fiverr API connector.
- Current floating orb uses a single-shot browser speech-recognition result and still requires owner admin JWT; it is not real-time duplex voice and is not a trusted-device sign-in flow.

## Delivery milestones

### M0 — Local baseline and regression gate
- Keep production untouched.
- Build frontend; run backend tests, companion tests, lint/type checks if configured.
- Confirm the local assistant UI, API origin, backend, database, and companion all point to the intended local services.
- Preserve the untracked local `.neon` file; never overwrite or commit secrets.

### M1 — Reliable local owner/device trust
- Replace repeated admin-login dependence for the local owner assistant with an explicit one-time device pairing flow.
- Use a high-entropy revocable device credential stored in Windows Credential Manager, short-lived access tokens, rotation/revocation, owner binding, CSRF/origin checks, and audit events.
- A four-digit PIN may unlock the local UI, but it is not the backend credential and must be rate-limited and protected against brute force.
- Public portfolio visitors must never inherit owner privileges.

### M2 — Browser worker (generic, local-first)
- Add a Playwright-controlled persistent browser context in the Windows companion, using a dedicated user-selected profile.
- Provide bounded tools: open URL, inspect page/accessibility tree, find visible text, click an unambiguous element, fill a field, scroll, wait, capture screenshot, and extract visible listing data.
- Require explicit domain scope per workflow; block downloads, arbitrary file access, shell execution, extension installation, credential extraction, and private-network navigation by default.
- Detect login, CAPTCHA, MFA, bot challenge, and policy restrictions and pause for the user instead of bypassing them.
- Add command timeouts, cancellation, step limits, idempotency, retries, and per-step evidence.

### M3 — Multi-step task orchestrator
- Persist workflows and ordered steps in the database; model queued/running/waiting-user/paused/completed/failed/cancelled states.
- Plan a sequence, execute one bounded step at a time, inspect actual page state after each step, and re-plan from observed results.
- Resume safely after refresh/restart; never replay non-idempotent steps blindly.
- Add workflow progress UI, live event stream, pause/resume/cancel, and an execution log.

### M4 — User profile and reusable preferences
- Store an owner-approved work profile: skills, truthful experience, portfolio links, preferred job types, minimum budget, availability, timezone, languages, and exclusions.
- Ask once for missing profile facts; never invent qualifications, past work, client results, or credentials.
- Allow the user to review and edit the profile.

### M5 — Cross-platform job research and proposal preparation
- Start with generic browser workflows on user-selected sites (Fiverr, Upwork, Freelancer, LinkedIn, company career pages, etc.), subject to each site's terms and technical controls.
- Extract only information visible to the authenticated user and allowed by site rules.
- Normalize listings, deduplicate, score against the owner profile, explain fit/mismatch, and retain source URLs and timestamps.
- Generate a distinct, truthful proposal for each opportunity; include a checklist of unanswered questions and missing facts.
- Save drafts locally/in the app. Do not auto-submit proposals or applications.

### M6 — Real-time voice
- Replace browser one-shot speech recognition with streaming audio input/output (WebRTC or equivalent), voice activity detection, automatic turn detection, interruption/barge-in, and spoken responses.
- Voice sessions must use the same authenticated workflow engine and permissions as text.
- Provide push-to-talk fallback if browser/device support prevents continuous listening. No hidden always-on microphone capture.

## Local acceptance test for the first usable release

1. Start backend and Windows companion locally; pair the owner's device once.
2. Open the public local portfolio; click Hey Suji; it opens without admin username/password prompts on the already trusted device.
3. Say: “Open Fiverr and find freelance jobs related to Python, FastAPI, React, and AI. Do not apply.”
4. The agent opens the site in its controlled browser, pauses for login/MFA if needed, then reads visible listings.
5. It returns a deduplicated shortlist with title, client/budget details when visible, source link, fit score, and reasons.
6. It drafts one truthful, tailored proposal per shortlisted job and saves each as a draft.
7. It does not click final Apply/Submit. It presents drafts for the user to review and submit.
8. Pause/resume/cancel works; refresh does not lose workflow state; failures are reported accurately.
9. Automated tests cover untrusted page content, prompt injection in listings, malicious links, cross-domain navigation, retries, timeouts, duplicate prevention, and approval gates.

## Release rule

No production merge or deployment until M0–M6 acceptance criteria appropriate to the release are passed locally and the user explicitly approves production release.
