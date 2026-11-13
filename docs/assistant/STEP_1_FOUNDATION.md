# Personal Assistant — Step 1 Foundation

## Scope
This step adds validated action schemas, a deterministic tool registry, and a policy layer. It intentionally does not execute browser or desktop actions.

## Initial registered tools
- `browser.open_url`: public HTTP(S) URLs only.
- `desktop.open_application`: `browser`, `calculator`, or `text_editor` only.

Every proposed action requires explicit approval. The action payload is canonicalized and SHA-256 hashed so a later approval/execution implementation can bind approval to the exact arguments.

## Security boundaries
- Unknown tools and extra arguments are rejected.
- JavaScript, file, credential-bearing, localhost and private-network URLs are rejected.
- No shell, PowerShell, arbitrary script, file deletion, messaging, form submission, or payment tools exist.
- This step only creates proposals; it cannot execute actions.

## Verification
Run from `backend/`:

```bash
pytest -q tests/test_assistant_policy.py
```

## Not included yet
- Persistent sessions/actions and database migration.
- Authentication and device pairing.
- LLM planning.
- Voice capture / TTS.
- Browser or desktop execution.
- WebSocket event streaming.
