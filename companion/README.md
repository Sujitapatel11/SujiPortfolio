# Suji Local Companion

A small Windows companion that opens approved Google and LinkedIn destinations in the computer's default browser.

## Run on Windows

```powershell
cd companion
$env:ASSISTANT_ALLOWED_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
py companion.py
```

Copy the one-time challenge printed in the terminal into the Personal Operator panel on the local portfolio. It expires after 120 seconds. Pairing lasts 15 minutes or until disconnect/restart.

## Commands currently supported

- `Search Google for Python internships`
- `Search LinkedIn for AI internships`
- `Open Google`
- `Open LinkedIn`

The companion binds only to `127.0.0.1:8765`. It uses a short-lived in-memory pairing token and exact website Origin allowlisting. It cannot run shell commands, read files, send messages, submit forms, make payments, or control arbitrary applications.

This is the first browser-navigation milestone only. Test locally before relying on it. Mobile and general desktop control are not implemented.
