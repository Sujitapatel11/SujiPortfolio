# Hey Suji — Personal AI Operator System Design

**Product:** Hey Suji, a cross-device personal AI operator.  
**Core brain:** Existing FastAPI backend.  
**Activation surfaces:** Portfolio floating orb, Android wake phrase / tap-to-talk, Windows wake phrase / hotkey.  
**Clients:** Lightweight device executors; they are not separate assistant brains.

## Product outcome

The owner can activate the same assistant from the portfolio or supported device context, speak naturally in Hindi or English, and ask it to complete multi-step tasks. The assistant plans work, uses explicitly registered tools, verifies results, and reports what actually happened.

Examples:
- "Hey Suji, open Instagram."
- "Search for AI Engineer internships, compare requirements, and shortlist relevant roles."
- "Open my GitHub and investigate the failed workflow."
- "On my portfolio, find the project details and prepare an updated description."

## System architecture

```text
Portfolio floating orb ─┐
Android companion ──────┼── HTTPS/WebSocket ── FastAPI assistant brain
Windows companion ──────┘                         │
                                                  ├── Authentication & device registry
                                                  ├── Conversation/session memory
                                                  ├── Intent planner and task orchestrator
                                                  ├── Deterministic tool registry + policy engine
                                                  ├── Approval queue + audit log
                                                  └── Execution queue
                                                       │
                                  ┌────────────────────┴────────────────────┐
                                  │                                         │
                           Android executor                         Windows executor
                       app launch, accessibility                browser, desktop, files
                       (permission-gated)                         (allowlisted tools)
```

The portfolio orb is an activation surface, not a separate AI. It uses the same authenticated FastAPI session and approval workflow. The public portfolio must not expose private operator APIs or device credentials to anonymous visitors.

## Responsibilities

### FastAPI brain
- Owns identity, authorization, session history, planning, memory, tool registry, action proposals, approvals, device routing and audit.
- Treats model output as untrusted input; validates every tool and argument deterministically.
- Routes a command only to an active, owner-paired device with a matching capability.
- Persists action state and execution results; never claims success without executor evidence.
- Uses one shared account and consistent task history across devices.

### Portfolio activation surface
- Floating "Hey Suji" orb appears on the portfolio.
- A click opens the assistant panel and begins browser-supported voice capture only after the user's gesture.
- Typed input remains available as a fallback.
- Requires an authenticated owner session; if not authenticated, direct the owner to sign in rather than exposing an unauthenticated control plane.
- Displays task status, approval details, and verified results.
- Does not gain permission to control the user's phone or desktop merely because it is embedded in a website. Device actions require a paired local executor.

### Android executor
- Minimal native Android component for microphone permission, app launch, foreground interaction, notification/status and device-bound command polling.
- AccessibilityService is optional, explicit, visible and user-enabled; it may interact only with supported UI elements and must respect Android security boundaries.
- Wake-word detection is opt-in and must be evaluated for battery, false activations, privacy and Android background restrictions. No hidden or continuous recording.
- No arbitrary shell execution, OTP/CAPTCHA handling, or bypass of app protections.

### Windows executor
- Background companion with explicit start/stop, OS credential storage, outbound HTTPS polling, persistent result journal and a strict tool allowlist.
- No arbitrary shell, PowerShell, script or executable-path execution.
- Browser automation is visible and scoped to supported sites and actions.

## Task lifecycle

1. Capture voice/text with explicit activation.
2. Resolve owner, active device and available capabilities.
3. Plan a multi-step task; ask a single clarification if required.
4. Validate each proposed tool call against deterministic policy and schemas.
5. Execute reversible, permitted steps on the selected device.
6. Verify each step from actual executor/browser evidence.
7. Pause for owner approval before consequential external actions.
8. Persist result and audit record; report completed, partial, blocked or failed accurately.

## Approval boundaries

Require explicit owner approval before sending/submitting messages, applications, posts or forms; purchases/payments/subscriptions; account/security changes; deleting data; sharing private files; or any irreversible/reputational/legal/financial action. The final application Submit action remains manual. Never automate CAPTCHA, OTP or anti-bot bypass.

## Security requirements

- Short-lived authenticated sessions; no anonymous assistant control API.
- Device pairing is one-time, owner-authorized, revocable and device-bound.
- Store device credentials in OS credential storage; never in browser localStorage.
- Bind commands to owner, device, tool, canonical arguments, payload hash, expiry and one-time nonce.
- Atomic command claim/result transitions; reject replay, tampering, expired commands and revoked devices.
- Persist pending execution results before acknowledging them.
- Never log secrets, access tokens, private transcripts or application content.
- Restrict CORS to exact portfolio origins; HTTPS in production.
- Keep a visible microphone indicator and immediate mute/disable control.

## Delivery plan and release gates

### Slice A — Portfolio activation + reliable voice
- Render the existing orb on the public portfolio.
- Authenticated owner-only voice/text panel using existing FastAPI session/message/approval APIs.
- Correct Java/Kotlin target compatibility and pass Android CI.
- Verify the portfolio build and existing frontend tests.

### Slice B — Unified device pairing and dispatch
- Harden pairing, revocation, atomic queue, nonce/hash/expiry validation and persistent result journal.
- Add Android outbound polling and safe local execution.
- Verify both Android and Windows clients against a disposable backend.

### Slice C — Browser and productivity operator
- Visible browser automation with site-specific capability policies and step evidence.
- Scoped file access, research, coding/GitHub and project workflows.
- Profile facts are sourced from owner-approved resume/portfolio data.

### Slice D — Job research copilot
- Search permitted sources, rank roles, explain fit, draft truthful proposals and prepare forms.
- Never invent experience or credentials; leave unknown facts blank.
- Owner manually submits each application.

### Slice E — Wake phrase
- Add opt-in "Hey Suji" only after physical-device battery, false-trigger, privacy and OS-background testing.
- The website orb remains a click-to-activate surface; it cannot listen continuously when the browser is closed.

## Verification and release rules

- Work only on `feat/unified-device-aware-companion`.
- Do not merge or deploy without a separate explicit release decision.
- CI, browser test, emulator test and physical-device test are separate evidence; report each separately.
- A green CI run does not prove Android wake-word or accessibility functionality.
- No success claim without a verified execution result.
