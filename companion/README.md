# Suji Personal Assistant Companion (Windows-first)

This version pairs the portfolio browser with a local Windows companion and can open URLs or perform Google searches in a visible Google Chrome window.

## Setup (Windows PowerShell)

```powershell
cd companion
$env:ASSISTANT_ALLOWED_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
py -m playwright install chromium
py companion.py
```

The terminal prints a one-time challenge valid for 120 seconds. Keep it private. Open the portfolio locally, open Personal AI, and pair using that challenge. Pairing expires after 15 minutes and is cleared on companion restart.

## Available actions
- `open_url`: opens a supplied HTTP(S) URL in visible Chrome.
- `google_search`: searches Google in visible Chrome.

The companion binds only to 127.0.0.1:8765 and requires exact allowed Origin, Host, JSON requests and a short-lived paired bearer token. No shell/PowerShell, file access, messages, form submissions, payments, or destructive actions are exposed. Navigation is initiated by an explicit user command. Do not expose this port through tunnels, router forwarding or LAN binding.

## Important limitations
- This is a first Windows browser-control milestone, not unrestricted desktop control.
- It controls Chrome, not arbitrary native apps or mobile applications.
- It uses a visible Playwright-managed Chrome instance; it does not attach to your existing Chrome profile or reuse its logged-in sessions.
- Website local-network permission/CORS behavior must be tested in your actual browser.
- Pairing is in-memory and one companion instance supports one paired session.
- Install Google Chrome for the configured `channel="chrome"` launcher.
