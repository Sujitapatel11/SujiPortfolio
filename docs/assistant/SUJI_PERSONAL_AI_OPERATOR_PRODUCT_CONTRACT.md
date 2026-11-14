# Suji Personal AI Operator — Product Contract

**Target clients:** Native Android app + Windows companion only.  
**Portfolio integration:** Explicitly out of scope. The portfolio and Job Hunter remain independent.  
**Account model:** One owner account, multiple explicitly paired devices.  
**Interaction:** Tap-to-talk first; wake-word activation is a later opt-in capability.

## Product goal

Build a personal AI operator that understands natural-language requests, plans multi-step work, uses approved tools on the correct device, reports what it actually completed, and pauses for owner approval before consequential external actions.

Example request: "Fiverr kholo, mere skills ke according relevant jobs dhundo, har job analyse karo, proposal draft karo, aur application form prepare karo." The operator may search, rank, draft, and fill permitted fields. The final application submission remains a user action.

## Client responsibilities

### Android
- Native Kotlin application.
- Tap-to-talk Hindi/English speech input and visible listening state.
- Device-local allowlisted app opening.
- Secure device pairing and command/result channel in a later slice.
- Wake-word only after foreground voice flow, battery, privacy, and Android background-execution constraints are tested.
- No hidden microphone recording.

### Windows
- Local companion process; outbound HTTPS connection only.
- Credentials stored in Windows Credential Manager through the OS keyring.
- Fixed, schema-validated tool adapters; no arbitrary shell, PowerShell, or script execution.
- Persistent execution-result journal before production dispatch.
- Device revocation and disconnect must stop future claims.

### Shared backend / AI brain
- Authenticated owner sessions, paired-device registry, revocation, command queue, immutable action proposals, approval records, execution results, and audit events.
- Planner output is untrusted. Every proposed tool call is checked against a deterministic registry and JSON schema.
- Every command is bound to owner, device, tool, canonical arguments, payload hash, expiry, and one-time nonce.
- Devices initiate outbound requests; cloud services never attempt to connect inbound to a user's laptop or phone.

## Autonomy model

The operator should perform as much reversible preparation as possible without asking repeatedly:
- Search and research public information.
- Open apps and navigate supported interfaces.
- Compare opportunities against the owner's saved skills/profile.
- Draft tailored proposals and cover letters.
- Prepare forms and attach only user-approved files.
- Summarize the exact pending action and evidence before handoff.

The operator must pause for explicit owner confirmation before:
- Sending or submitting applications, messages, posts, comments, or forms.
- Purchases, payments, subscriptions, or financial transfers.
- Account/security changes, deleting data, or sharing private files.
- Any action with legal, financial, reputational, or irreversible consequences.

The final submit control must be operated by the owner. Do not automate CAPTCHA, OTP, anti-bot controls, or bypass a website's terms/access restrictions. If a platform blocks automation, explain the limitation and provide a prepared draft or manual handoff.

## Initial supported tool families

1. Device: open a fixed allowlisted application.
2. Browser: open a validated public HTTPS URL and perform supported navigation/search.
3. Research: search, extract, compare, summarize, and cite sources.
4. Files: list/read user-selected files; create/edit drafts in an explicitly approved workspace. Destructive file operations require separate confirmation.
5. Coding: inspect selected repositories, propose diffs, run tests in a bounded workspace, and request approval before pushing/merging/deploying.
6. Job workflow: discover roles, score fit, flag suspicious listings, draft truthful tailored proposals, prepare application fields, and stop before final submission.

No job application may contain invented experience, skills, qualifications, portfolio links, or availability. Missing facts must be left blank or asked about.

## Delivery phases and gates

### Phase 1 — Reliable local voice foundation
- Improve Android intent parsing beyond substring matching.
- Add English/Hindi command normalization, explicit unsupported-command feedback, and tests.
- Build and install on a real Android device.
- Verify allowlisted app launch and permission denial paths.
- Windows companion smoke tests for existing safe local actions.

### Phase 2 — One account, two paired devices
- Implement secure one-time pairing, credential rotation, revocation, device list, and owner/device binding.
- Remove browser-localStorage as a trusted device credential store.
- Add atomic claim/result transitions and replay/tamper/expiry tests.
- Persist Windows pending results before acknowledging execution.
- Add Android outbound command polling with a strict local tool allowlist.
- End-to-end test both clients against a disposable backend.

### Phase 3 — Browser operator
- Add a visible browser automation adapter with per-site capability rules.
- Support search, navigation, and form preparation where permitted.
- Use screenshots/DOM evidence to verify each step; never claim an action succeeded without confirmation.
- Keep sensitive actions in a review queue.

### Phase 4 — Personal knowledge and productivity tools
- User-selected file access, coding/GitHub workflows, project management, research and structured memory.
- Scoped permissions per tool and workspace.
- Audit log and undo/recovery guidance where technically possible.

### Phase 5 — Job application copilot
- Build a user-approved profile from verified resume/portfolio facts.
- Search and rank suitable roles on permitted sources.
- Draft a distinct truthful proposal for each role.
- Fill allowed form fields and attach only approved documents.
- Show role, company, compensation (if stated), requirements, proposal, attachments, and all form values in a final review.
- Owner manually clicks Submit.

### Phase 6 — Wake word and advanced autonomy
- Add opt-in wake-word only after measured battery use, false activations, privacy controls, and platform policy review.
- Keep a visible microphone indicator and an immediate mute/disable control.

## Release rules

- Work only on `feat/unified-device-aware-companion` until the owner reviews the branch.
- Do not merge, deploy, modify the portfolio website, or touch the Job Hunter feature without separate approval.
- A passing CI run is not proof of real-device functionality. Report CI, emulator, physical-device, and production verification separately.
- No secrets, tokens, transcripts, or private application content in logs.
- Every external action must have an auditable proposal, explicit approval state, and truthful execution result.
