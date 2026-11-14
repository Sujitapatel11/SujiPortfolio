# Suji Personal Assistant Companion (Windows-first)

Local-only pairing foundation. This companion exposes status and capability metadata only. It cannot execute desktop actions.

## Security boundary

- Binds only to `127.0.0.1:8765`; never change to `0.0.0.0`.
- No long-lived bearer token is stored on disk.
- On direct startup, a one-time pairing challenge is printed to the local terminal. It expires after 120 seconds and is single-use.
- Configure exact website origins with `ASSISTANT_ALLOWED_ORIGINS`, comma-separated. Example:
  `$env:ASSISTANT_ALLOWED_ORIGINS = "https://your-real-portfolio-domain.example"`
  Replace the example with the actual origin. Do not use wildcard origins.
- Pairing returns a random session token valid for 15 minutes. Keep it in browser memory only. Never commit it, paste it into chat, put it in a URL, or persist it in browser storage.
- Restarting the companion invalidates all sessions and creates a new challenge.
- `/health` is minimal and unauthenticated. `/v1/capabilities` and disconnect require the paired session token.
- No shell, PowerShell, process launch, file access, browser control, microphone, or desktop action endpoints exist.
- Do not expose port 8765 through router port forwarding, tunnels, reverse proxies, or LAN binding.

## Run on Windows

```powershell
cd companion
$env:ASSISTANT_ALLOWED_ORIGINS = "https://your-real-portfolio-domain.example"
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
py companion.py
```

The companion prints a one-time challenge locally. Enter it manually in the authenticated assistant UI when that UI's pairing screen is implemented. Do not share the challenge.

## Endpoints

- `GET http://127.0.0.1:8765/health` — minimal status; no credentials.
- `POST /v1/pairing/complete` — exact trusted Origin, expected Host, JSON body `{"challenge":"..."}`; returns device ID, short-lived session token and expiry once.
- `GET /v1/capabilities` — requires `Authorization: Bearer <session_token>`.
- `POST /v1/pairing/disconnect` — requires the paired token and trusted browser request headers; immediately revokes the in-memory session.

## Current limitations

- Pairing state and credentials are in memory; restarting requires re-pairing.
- One paired browser session is supported at a time.
- Website UI integration is not implemented yet.
- Browser integration tests on Windows have not yet been run.
- Pairing does not authorize execution. The response always advertises `execution_enabled: false`.

## Tests

From the repository root, install the companion requirements and run:

```powershell
py -m pytest companion/tests -q
```

Do not treat pairing as production-ready until these tests pass on Windows and browser integration verifies the actual Origin/Host/fetch-metadata behavior.
