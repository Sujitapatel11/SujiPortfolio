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
py -m playwright install chromium
py companion.py
```

3. Copy the one-time challenge shown in the terminal into Personal Operator and pair once.
4. The pairing token is stored in Windows Credential Manager. The portfolio stores its copy in this browser's local storage. Restarting the companion or refreshing the portfolio does not require pairing again.
5. The managed assistant browser has its own isolated profile and login sessions. If you want to use a site in that managed browser, sign in manually inside its Chromium window. It does not import or read cookies, passwords or sessions from your normal Chrome/Edge profile.

Pairing is revoked only when you choose Disconnect. If you clear browser storage, lose the Windows credential, or explicitly disconnect, pair again. Website sessions can still expire and request their own sign-in or verification.

## Supported commands

- `Open Google`, `Open LinkedIn`, `Open Instagram`, `Open WhatsApp`, `Open GitHub`
- `Open Calculator`, `Open Notepad`, `Open Browser`
- `Open Desktop`, `Open Documents`, `Open Downloads`, `Open Pictures`
- `List files in Downloads` (also Desktop/Documents/Pictures)
- Preview TXT, Markdown, CSV and JSON files (read-only, max 128 KB)
- `Open report.pdf from Downloads` (AI proposal + explicit approval)
- `Search Google for Python internships`
- `Search LinkedIn for AI internships`
- `Browse GitHub` / `Browse Google` / `Browse LinkedIn` (opens isolated assistant browser)
- `Inspect page` (read-only title and up to 5,000 characters of page text)
- `Click link Issues` (navigates to one unique, allowlisted link destination)
- `Fill search with Python jobs` (fills exactly one visible search box but does not submit it)

The service binds only to `127.0.0.1:8765`, checks the exact configured Origin and Host, and stores the pairing secret in Windows Credential Manager through Python keyring. Windows application launching uses fixed executable names with `shell=False`; no user-provided command line is accepted. It can open only the fixed Desktop, Documents, Downloads and Pictures folders. Read-only listings show up to 100 supported non-hidden files (PDF, text, office documents, images and media); selecting a listed file opens it with its Windows default application. Plain-text previews support only UTF-8 TXT, Markdown, CSV and JSON files up to 128 KB. Preview content is returned to the paired portfolio UI; it is not stored by the companion. AI-proposed file opening requires explicit approval. Arbitrary paths, file contents, file modification, shell commands, messaging, form submission, payments and arbitrary application control remain blocked. Website navigation is restricted to an explicit host allowlist. Managed browser automation uses a separate persistent Chromium profile under the current Windows user and does not access the user’s normal Chrome/Edge profile. It supports allowlisted navigation, read-only page text inspection, unique-link destination navigation, and filling exactly one visible search box without submitting it. The AI planner may also propose page inspection or search-box filling as approval-gated actions; the exact action must be approved in the portfolio UI before the companion runs it. It never presses Enter or submits the containing form. If the page has zero or multiple search boxes, the action stops and asks for a more specific approach. You must install Chromium once with the Playwright command above; the GitHub CI tests validate the policy and mocked browser interactions, not a live Windows browser session. Link navigation uses the validated href directly rather than triggering page click handlers. It does not fill or submit forms, click buttons, send messages, download files, or interact with payments.

AI planning is available only after signing into the portfolio admin and configuring `OPENAI_API_KEY` on the backend. Planner-created actions are validated against the same allowlist, shown for review, and require explicit approval before the local companion runs them. The backend records approval and execution outcome. Direct, simple allowlisted open/search commands are handled locally by the companion.

For production hosting, set `ASSISTANT_ALLOWED_ORIGINS` to the exact HTTPS portfolio origin and set backend `CORS_ORIGINS` to the same frontend origin. Never use `*`.
