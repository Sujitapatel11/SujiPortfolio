# Suji Local Companion

A Windows-only local companion for the Personal Operator. It opens a strict allowlist of websites and Windows applications in the local desktop.

## One-time setup

1. Install Python 3.11+.
2. In PowerShell, run:

```powershell
cd companion
$env:ASSISTANT_ALLOWED_ORIGINS = "https://YOUR-PORTFOLIO-DOMAIN,http://localhost:5173"
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
py companion.py
```

3. Copy the one-time challenge shown in the terminal into Personal Operator and pair once.
4. The pairing token is stored in Windows Credential Manager. The portfolio stores its copy in this browser's local storage. Restarting the companion or refreshing the portfolio does not require pairing again.
5. Your Google and LinkedIn login sessions remain in your normal browser profile. Sign in yourself once in that browser; the companion does not read passwords or cookies.

Pairing is revoked only when you choose Disconnect. If you clear browser storage, lose the Windows credential, or explicitly disconnect, pair again. Website sessions can still expire and request their own sign-in or verification.

## Supported commands

- `Open Google`, `Open LinkedIn`, `Open Instagram`, `Open WhatsApp`, `Open GitHub`
- `Open Calculator`, `Open Notepad`, `Open Browser`
- `Search Google for Python internships`
- `Search LinkedIn for AI internships`

The service binds only to `127.0.0.1:8765`, checks the exact configured Origin and Host, and stores the pairing secret in Windows Credential Manager through Python keyring. Windows application launching uses fixed executable names with `shell=False`; no user-provided command line is accepted. It cannot run arbitrary shell commands, read files, send messages, submit forms, make payments, or control arbitrary applications. Website navigation is restricted to an explicit host allowlist.

AI planning is available only after signing into the portfolio admin and configuring `OPENAI_API_KEY` on the backend. Planner-created actions are validated against the same allowlist, shown for review, and require explicit approval before the local companion runs them. The backend records approval and execution outcome. Direct, simple allowlisted open/search commands are handled locally by the companion.

For production hosting, set `ASSISTANT_ALLOWED_ORIGINS` to the exact HTTPS portfolio origin and set backend `CORS_ORIGINS` to the same frontend origin. Never use `*`.
