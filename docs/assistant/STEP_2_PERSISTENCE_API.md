# Personal Assistant — Step 2: persistence and authenticated API

## Database objects
- `assistant_sessions`: owner, input mode, paired device reference, status and expiry.
- `assistant_messages`: user message text, input mode and timestamp.
- `assistant_actions`: registered tool, validated arguments, summary, payload digest, approval state and expiry.
- `assistant_audit_events`: actor, event type and structured event details.

Migration: `007_personal_assistant`, after `006_expand_job_hunter_schema`.

## API
All endpoints are protected by the existing admin JWT dependency in this prototype.

- `POST /api/assistant/sessions` — create a 12-hour session.
- `GET /api/assistant/sessions/{session_id}` — retrieve an owned active session.
- `POST /api/assistant/sessions/{session_id}/messages` — persist a voice-transcribed or typed user message.
- `GET /api/assistant/sessions/{session_id}/messages` — list up to 100 messages.
- `POST /api/assistant/sessions/{session_id}/actions` — validate and persist a proposal; proposals expire after 10 minutes.
- `GET /api/assistant/sessions/{session_id}/actions` — list proposals.
- `POST /api/assistant/actions/{action_id}/decision` — record explicit approval or rejection.
- `GET /api/assistant/sessions/{session_id}/audit` — retrieve audit events.

## Important current limitation
Approval in this step is a persisted user decision only. There is no execution endpoint and no browser/desktop action is run. Natural-language planning is not implemented yet; the messages endpoint stores the transcript and explicitly reports that planning is a later step.

## Local verification
From `backend/`:

```bash
alembic upgrade head
pytest -q tests/test_assistant_policy.py tests/test_assistant_persistence_schema.py
```

Do not run the migration against production. Verify the configured local database first and take a backup before applying schema changes to any shared database.
