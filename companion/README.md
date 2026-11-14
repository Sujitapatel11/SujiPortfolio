# Suji Personal Assistant Companion (Windows-first bootstrap)

This is a local-only companion service foundation. It is intentionally **not an automation agent yet**.

## Safety boundary

- The server binds only to `127.0.0.1:8765`. Do not change this to `0.0.0.0`.
- A random bearer token is generated on first start and stored under `%LOCALAPPDATA%\SujiAssistant\companion.token`.
- The token file is created with restrictive permissions where supported. On Windows, protect the Windows user profile with normal account/NTFS permissions.
- `/health` returns service status only.
- `/v1/capabilities` requires the bearer token.
- No shell, PowerShell, process-launch, file access, browser control, microphone, or desktop action endpoints exist.
- Do not expose port 8765 through router port forwarding, tunnels, reverse proxies, or LAN binding.

## Run on Windows

```powershell
cd companion
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
py companion.py
```

First start creates the token file. For a local smoke test, read the token from the local file and call:

```powershell
$token = Get-Content "$env:LOCALAPPDATA\SujiAssistant\companion.token" -Raw
Invoke-RestMethod http://127.0.0.1:8765/health
Invoke-RestMethod http://127.0.0.1:8765/v1/capabilities -Headers @{ Authorization = "Bearer $($token.Trim())" }
```

The token is a local secret. Never paste it into chat, commit it, put it in frontend source, or expose it in browser logs.

## Next security work

Before any desktop action is enabled, implement explicit web-to-local pairing with origin/host validation, short-lived pairing challenges, per-device revocation, replay protection, and a strict tool allowlist. Add OS-level permission boundaries and execution-time validation. This bootstrap alone does not implement those features.
