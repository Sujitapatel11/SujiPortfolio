# Phase 1 — Secure device pairing protocol

Status: design baseline only. No pairing endpoint or browser-to-companion trust is enabled by this document.

## Scope

Pair the authenticated portfolio assistant UI with one locally running Windows companion. The companion remains bound to 127.0.0.1 and exposes no desktop execution capabilities during this phase.

## Threat model

Assume:
- A hostile website may attempt to make requests to localhost.
- A browser tab may be opened from an untrusted origin.
- A local process may attempt to guess or replay pairing material.
- The companion process may restart and lose volatile pairing state.
- The backend admin JWT may be stolen independently of the local device credential.

Protect against:
- Cross-origin drive-by pairing and CSRF.
- Pairing-code guessing, reuse, and replay.
- Credential disclosure through URLs, logs, frontend bundles, or persistent browser storage.
- LAN/public exposure of the companion.
- Reuse of revoked or expired device credentials.

Out of scope for this phase:
- Protection against malware already running as the same Windows user.
- Remote desktop execution, browser automation, or arbitrary shell commands.
- Treating CORS as authentication. CORS is only one browser-enforced boundary.

## Pairing ceremony

1. The companion starts on 127.0.0.1 only and creates an ephemeral, cryptographically random pairing challenge.
2. The challenge is displayed locally by the companion process/UI; it is never placed in a URL, query string, or log.
3. The user is already authenticated to the assistant website and manually enters the locally displayed challenge.
4. The website calls the loopback pairing endpoint. The companion validates the exact Origin against a configured allowlist, validates Host is a loopback authority, requires an expected browser fetch metadata policy, and consumes the challenge atomically.
5. The companion returns a short-lived pairing response only once. The browser keeps any resulting session credential in memory only; it must not write it to localStorage, sessionStorage, IndexedDB, cookies, or logs.
6. The UI shows the paired device identity and provides an explicit disconnect action.
7. Restart, timeout, disconnect, or failed pairing invalidates the pending challenge. Re-pairing is required after restart in the initial implementation.

## Credential design requirements

- Challenge: at least 256 bits of cryptographic randomness; short expiry (maximum 2 minutes); single-use; constant-time comparison where applicable.
- Pairing attempt rate limit: bounded attempts per process and per source; lock the challenge after a small number of failures.
- Session credential: independent random value with at least 256 bits of entropy; maximum 15-minute lifetime; stored only in companion memory and browser memory.
- No long-lived companion bearer token may be embedded in frontend code or sent to the hosted backend.
- Device identity is a non-secret random identifier. It is not an authenticator.
- Revocation/disconnect invalidates the active session immediately.
- All credential comparisons use constant-time comparison. Never log challenge or credential values.

## Browser-to-loopback request requirements

- Bind only to 127.0.0.1; never 0.0.0.0 or a LAN interface.
- Allow only exact configured website origins; no wildcard, suffix, substring, or reflected Origin matching.
- Validate the Host header against the expected loopback host and port.
- Reject missing, null, malformed, or unexpected Origin on state-changing routes.
- Validate Sec-Fetch-Site where supported; reject cross-site requests.
- Do not treat CORS preflight success as authorization.
- Require JSON content type and reject form/simple content types for state-changing endpoints.
- Do not follow redirects on credential-bearing local requests.
- Return restrictive CORS headers only for exact allowlisted origins.
- Keep /health non-sensitive and unauthenticated; every capability or pairing-status endpoint must be authenticated or deliberately minimal.

## Backend relationship

The backend remains the authority for user authentication, policy, approvals, and audit. The local companion is not given an admin JWT. The browser acts as a constrained bridge between the authenticated UI and localhost.

Before any execution feature is added, a later design must bind an approved action's immutable payload hash, action expiry, user identity, device identity, and one-time execution nonce. The companion must independently validate all of them. Approval alone must never authorize a different or modified payload.

## Required tests before enabling pairing

- Reject wrong/missing/null Origin.
- Reject unexpected Host and non-loopback bind configuration.
- Reject missing/invalid content type and cross-site fetch metadata.
- Accept only the exact configured origins.
- Expired challenge rejected.
- Challenge can be consumed exactly once.
- Failed-attempt limit enforced.
- Session credential expires and disconnect revokes immediately.
- Credential never appears in logs, URLs, responses other than the one-time pairing response, or persistent browser storage.
- Service remains execution-disabled in every test.

## Rollout gates

Pairing must remain disabled until all tests pass on Windows and at least one browser integration test verifies the actual Origin/Host/fetch-metadata behavior. Do not deploy or merge as part of this phase.
