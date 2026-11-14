# Step 4 — Execution Engine Design and Safety Contract

**Date:** 2026-11-14  
**Branch:** `feat/suji-assistant-execution-engine`  
**Base:** `main` at merge commit `9677367cee8a2ac8f2f4507686bd3eafaad44795`  
**Status:** Design gate before executor implementation. No execution capability is enabled by this document.

## 1. Verified current behavior

The current backend:
- Authenticates assistant routes with the admin JWT dependency.
- Persists sessions, messages, proposals, action payload hash and audit events.
- Revalidates session owner/status and action expiry when the owner approves/rejects.
- Changes an action from `awaiting_approval` to `approved` or `rejected`.

The current backend does **not** execute approved actions. The approval endpoint is explicitly a persistence/decision endpoint. The tool registry says it defines capabilities only and does not execute them.

The current companion:
- Runs on the user's Windows computer at `127.0.0.1:8765`.
- Uses a local pairing challenge and bearer token.
- Supports browser URL/search actions through `webbrowser.open`.
- Does not provide a secure hosted-backend-to-device command queue.
- Does not currently implement native app launch.

## 2. Architectural constraint

The API hosted on Render cannot call `webbrowser.open` on the user's Windows laptop. A cloud server and a local Windows process are different machines and security boundaries.

Therefore execution must be **device initiated**: the paired Windows companion maintains an outbound authenticated connection to the hosted API and polls/long-polls for commands. Do not expose the user's laptop as an inbound public server and do not make Render try to execute local desktop actions.

## 3. Required execution lifecycle

```text
Voice / typed request
        |
        v
Planner -> deterministic tool allowlist -> persisted proposal
        |
        v
Owner reviews exact tool + arguments + target device
        |
        v
Explicit approval (owner JWT)
        |
        v
Immutable approved command envelope
        |
        v
Paired companion claims command over outbound authenticated API
        |
        v
Companion verifies envelope + local allowlist + expiry + nonce
        |
        v
One local action executes
        |
        v
Companion posts signed/authenticated result
        |
        v
Backend marks completed/failed and appends audit event
```

No transition may skip explicit approval. A planner response is untrusted input, not permission to execute.

## 4. Command envelope (version 1)

Each dispatchable command must contain:
- `command_id`: unique opaque ID.
- `action_id`: persisted action ID.
- `owner_username`: authenticated owner identity.
- `device_id`: paired target device.
- `tool`: exact registered tool identifier.
- `arguments`: canonical, schema-validated JSON.
- `payload_sha256`: hash of canonical tool + arguments.
- `issued_at` and `expires_at`: UTC timestamps; short TTL.
- `nonce`: cryptographically random, single-use value.
- `protocol_version`: explicit version for future compatibility.

Backend and companion must independently validate tool, exact argument keys/types, payload hash, device binding, expiry and nonce. Never trust a client-supplied `summary` or LLM-generated policy claim.

## 5. State machine

Allowed state transitions:
- `awaiting_approval -> approved` (owner approval only).
- `awaiting_approval -> rejected` (owner rejection only).
- `awaiting_approval -> expired` (TTL reached).
- `approved -> executing` (one paired device claims the exact approved command).
- `executing -> completed` (authenticated device result).
- `executing -> failed` (authenticated device result or bounded execution timeout).
- `approved -> cancelled` (owner cancels before claim).
- `executing -> failed` on timeout; do not blindly replay an action whose execution outcome is uncertain.

All transitions must be atomic and audited. Duplicate claims, replayed nonces, changed payload hashes, wrong device, wrong owner, expired command or repeated results must be rejected. Use a database compare-and-set / row lock, not read-then-write logic vulnerable to races.

## 6. Device pairing requirements

The existing local companion pairing protocol is not sufficient for hosted dispatch. Before allowing remote command polling:
1. Pair device with a short-lived one-time challenge initiated by the authenticated owner.
2. Generate a high-entropy device credential; store only a salted/secure hash server-side.
3. Store device credential in Windows Credential Manager/keyring, never localStorage.
4. Support revocation and key rotation.
5. Bind every command and result to the paired device ID.
6. Require HTTPS for all hosted API traffic.
7. Companion uses outbound requests only; no inbound internet listener.
8. Rate-limit pairing, polling and result endpoints; redact credentials from logs.

The current frontend stores the companion bearer token in browser localStorage. Replace this design before treating hosted device pairing as production secure.

## 7. Initial tool adapters

### Allowed first
- `browser.open_url`: only HTTP(S), no embedded credentials, block local/private/reserved destinations, exact canonical payload, open in default browser.
- `desktop.open_application`: fixed app IDs mapped to fixed executable/URI handlers on Windows. No arbitrary executable path or command arguments.

### Explicitly disallowed
- Shell, PowerShell, cmd, arbitrary scripts.
- Arbitrary file reads/writes/deletes.
- Sending messages or submitting applications.
- Purchases, payments, account changes or other consequential external actions.

WhatsApp/Instagram "open" must be clearly described as opening the native app only if verified; otherwise open the web version and report that accurately.

## 8. Execution result contract

Companion result must include:
- command/action IDs and device ID.
- final outcome `completed` or `failed`.
- safe result code and short user-readable description.
- start/end timestamps.
- payload hash and nonce/command correlation.
- no secrets, message contents or unnecessary personal data in logs.

Backend accepts only one terminal result for a command and records it with an audit event. A timeout is not proof that the action did not run; do not automatically retry ambiguous actions.

## 9. Implementation slices and acceptance gates

### Step 4.1 — Backend execution state and queue
- Add migration for command envelope, nonce, claim/result timestamps and device credential hash.
- Add atomic command claim and result endpoints.
- Owner approval creates an approved immutable command only when a device is paired.
- Tests for unauthenticated access, owner/device mismatch, payload tampering, expired command, nonce replay, duplicate claim, duplicate result and timeout.
- No desktop command executes in the cloud.

### Step 4.2 — Secure Windows pairing and outbound polling
- Replace localStorage bearer token.
- Add authenticated device registration, revocation and outbound poll loop.
- Keep localhost companion bound to loopback only.
- Test against local disposable API and companion.

### Step 4.3 — First real adapters
- Browser URL open adapter with strict host policy.
- Windows calculator and text editor launch via fixed mappings.
- Native app tests on the actual Windows laptop; CI mocks are not enough.

### Step 4.4 — End-to-end owner workflow
- Voice/text request -> proposal -> exact approval -> device claim -> execute -> result -> audit.
- Confirm no action occurs on proposal, rejection, expiry, changed payload or replay.

## 10. Release gate

This design document does not enable execution. Do not deploy or expose an executor until Step 4.1–4.4 acceptance gates pass. Keep Render deployment for the final release stage as agreed.
