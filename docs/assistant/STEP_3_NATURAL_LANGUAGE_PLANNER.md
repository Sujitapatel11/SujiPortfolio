# Personal Assistant — Step 3: Natural-language planning

## Delivered

- Added `app.assistant.planner`, an OpenAI Chat Completions adapter using `gpt-4o-mini`.
- The planner returns only one of three outcomes: an allowlisted action proposal, a clarification question, or an unsupported response.
- Connected the planner to `POST /api/assistant/sessions/{session_id}/messages`.
- User and assistant messages are persisted. Proposed actions are persisted with a ten-minute expiry and an audit event.
- The existing deterministic policy validates every model-proposed tool and argument. Unknown or malformed tools fail closed.
- The planner does not execute tools. An approval only changes the stored decision state; execution is not implemented in this step.

## Configuration

Set `OPENAI_API_KEY` in the backend environment. Do not commit the key to Git or expose it in frontend variables. If it is missing, the endpoint returns HTTP 503 and explains that planning is not configured.

## Current supported intents

- Open a public website via `browser.open_url`.
- Open one of the initial desktop allowlist apps: `browser`, `calculator`, or `text_editor`.
- Ask a clarification question when the request is ambiguous.
- Reject unsupported intents.

## API response

A successful message request returns `message`, `status`, and optionally `proposal`. For an action, the response explicitly says that it is waiting for approval. No action is run.

## Verification still required

The tests in `backend/tests/test_assistant_planner.py` cover response parsing and fail-closed tool validation. They have been added but have **not** been run in the local project environment. Before merging or deploying, run:

```powershell
cd backend
python -m pytest tests/test_assistant_planner.py tests/test_assistant_policy.py tests/test_assistant_persistence_schema.py -q
```

Then test the authenticated API against a local development database. Do not apply the migration to production as part of this step.

## Deliberate exclusions

No browser automation, desktop companion, voice capture, speech output, frontend orb integration, background autonomy, arbitrary shell execution, messaging, payments, purchases, form submissions, or destructive file operations are included here.
