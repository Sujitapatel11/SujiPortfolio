# Phase 1 — Secure device pairing protocol

Status: implementation baseline. Pairing is local and short-lived; desktop execution remains disabled.

## Scope and trust boundaries

Pair one authenticated portfolio assistant browser session to one Windows companion running only on 127.0.0.1. The backend remains authoritative for user identity, policy, approvals, and audit. The companion does not receive the admin JWT. The browser is a constrained bridge.

CORS is not authentication. Exact Origin validation, Host validation, challenge consumption, short-lived credentials, and local-only binding are separate controls.

## Pairing ceremony

1. Start the companion locally. It generates a cryptographically random one-time challenge and displays it in the local terminal. The challenge is valid for 120 seconds.
2. In the authenticated assistant UI, the user manually enters the challenge. It must never be put in a URL, query string, source code, or logs.
3. The browser sends a JSON POST to http://127.0.0.1:8765/v1/pairing/complete. The companion validates the exact configured Origin, Host, content type, and challenge. It atomically consumes the challenge.
4. On success, the companion returns a random 256-bit-or-greater bearer session credential once. The UI keeps it in memory only. No localStorage, sessionStorage, IndexedDB, cookies, or backend persistence.
5. The credential expires after 15 minutes. The UI can explicitly disconnect; disconnect revokes it immediately.
6. Restarting the companion invalidates all sessions and creates a fresh challenge.

## Browser request controls

- Bind only to 127.0.0.1; never 0.0.0.0 or a LAN interface.
- Configure exact trusted website origins with ASSISTANT_ALLOWED_ORIGINS, comma-separated. No wildcard, suffix, substring, or reflected Origin matching.
- Validate Host as exactly 127.0.0.1:8765.
- Reject missing, null, malformed, or untrusted Origin on every state-changing route.
- Require application/json on state-changing routes.
- Validate Sec-Fetch-Site when present, but do not blindly reject cross-site: a hosted portfolio calling localhost is cross-site by browser definition. The exact Origin allowlist is the trust decision. Reject none/invalid values; permit cross-site only for an exact allowlisted Origin.
- CORS allows only configured exact origins, methods GET/POST, and headers Authorization/Content-Type. Preflight is not authentication.
- Do not follow redirects for credential-bearing local requests.
- Keep /health minimal and unauthenticated.

## Credential and abuse controls

- Challenge: 256-bit random secret, 120-second lifetime, one-time use.
- Pairing attempts: maximum 5; challenge is invalidated after the limit.
- Session credential: independent 256-bit random secret, 15-minute lifetime, memory only.
- Device ID is random, non-secret metadata and never an authenticator.
- Compare secrets with constant-time comparison.
- Never log challenge or session credential values.
- Disconnect revokes current session. Restart clears all in-memory state.
- Initial version supports one paired browser session at a time.

## Endpoints

- POST /v1/pairing/complete — exact-origin JSON request with { "challenge": "..." }; returns device_id, expires_at, and one-time session_token.
- GET /v1/capabilities — requires Authorization: Bearer <session_token>.
- POST /v1/pairing/disconnect — requires the same session credential and revokes it.
- GET /health — minimal status only; always reports execution_enabled=false.

## Explicitly not implemented

No desktop app launch, shell/PowerShell, file access, browser control, microphone capture, or remote execution. Pairing does not grant execution permission.

Before execution is added, a separate design must bind the approved immutable action payload hash, action expiry, user identity, device identity, and one-time execution nonce. The companion must independently validate these values immediately before execution.

## Tests and rollout gates

Test exact-origin acceptance; missing/null/wrong Origin rejection; wrong Host rejection; invalid content type rejection; challenge expiry; one-time consumption; attempt lockout; session expiry; immediate disconnect revocation; no token in health/logs; execution always disabled. Run unit tests and browser integration tests on Windows before treating pairing as production-ready.

Do not merge or deploy as part of this phase.


## Current implementation notes

The companion currently implements:
- `POST /v1/pairing/complete` with exact allowlisted Origin, exact `127.0.0.1:8765` Host, JSON content type, and optional valid Fetch Metadata.
- A 120-second one-time challenge, five failed-attempt maximum, and in-memory 15-minute session credential.
- `GET /v1/capabilities` protected by the paired credential.
- `POST /v1/pairing/disconnect` protected by the paired credential and browser-request validation.
- `GET /health` with no credential material and `execution_enabled: false`.

The local challenge is printed only when running `py companion.py` directly. Set `ASSISTANT_ALLOWED_ORIGINS` to the exact real portfolio origin before starting. The current default allowlist is for local development only.

Not yet implemented:
- Pairing UI and in-memory token handling in the React frontend.
- Pairing event/audit integration with the hosted backend.
- Windows browser integration tests.
- Persistent device registry or multi-device management.

Pairing is an initial local prototype, not production-ready. Do not enable desktop execution based on pairing alone.
