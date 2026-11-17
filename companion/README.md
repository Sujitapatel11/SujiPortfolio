# Suji Local Companion

A Windows-only local companion for the Personal Operator. It opens approved Google and LinkedIn pages in the computer's default browser.

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

3. Copy the one-time challenge shown in the terminal into Personal Operator and connect this computer.
4. The pairing token is stored in Windows Credential Manager. The portfolio stores its copy in this browser's local storage. Restarting the companion or refreshing the portfolio does not require pairing again.
5. If browser storage is cleared or the browser token is lost, restart the companion and enter its fresh challenge. A successful fresh challenge safely rotates the old token and invalidates the previous browser pairing; no manual Credential Manager deletion is required.
6. Your Google and LinkedIn login sessions remain in your normal browser profile. Sign in yourself once in that browser; the companion does not read passwords or cookies.

Pairing is revoked only when you choose Disconnect. If you clear browser storage, lose the Windows credential, or explicitly disconnect, pair again. Website sessions can still expire and request their own sign-in or verification.

## Supported commands

- `Open Google`
- `Open LinkedIn`
- `Search Google for Python internships`
- `Search LinkedIn for AI internships`

The service binds only to `127.0.0.1:8765`, checks the exact configured Origin and Host, and stores the pairing secret in Windows Credential Manager through Python keyring. It cannot run shell commands, read files, send messages, submit forms, make payments, or control arbitrary applications.

For production hosting, set `ASSISTANT_ALLOWED_ORIGINS` to the exact HTTPS portfolio origin. Never use `*`.


## Hosted assistant execution queue (Step 4.2)

The companion can be connected to the hosted assistant queue through its loopback-only API. The backend must first register the device and return its one-time device ID and credential. Send those values only to the local companion's `/v1/backend/connect` endpoint from the authenticated owner UI; the companion validates the credential against the backend and stores it in Windows Credential Manager. The companion then polls the backend outbound over HTTPS and runs only the fixed allowlist: public HTTP(S) browser URLs, Windows Calculator, and Notepad. No shell commands or arbitrary executable paths are supported.

The hosted queue connection is separate from the legacy browser-pairing token. Use `/v1/backend/disconnect` to stop polling and remove the backend credential. The local server remains bound to loopback only.
