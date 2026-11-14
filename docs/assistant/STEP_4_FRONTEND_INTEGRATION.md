# Personal Assistant — Step 4: Frontend integration

## Delivered

- Added `frontend/src/api/personalAssistant.js` for session creation, natural-language messages, and approval decisions.
- Added a standalone `PersonalAssistantOrb.jsx` with typed input, browser speech recognition, speech synthesis, conversation display, proposal details, and approve/reject controls.
- Mounted the new orb independently in `App.jsx`.
- Left `JobHunterOrb.jsx` and its behavior unchanged. The personal assistant orb is positioned on the lower-left to avoid occupying the Job Hunter orb's lower-right position.

## Authentication and configuration

The component uses the existing owner/admin authentication context and bearer token. The backend must be reachable at `VITE_API_URL` (default: `http://localhost:8000`). This is not a public anonymous assistant.

## Current behavior

1. Opening the orb does not create a session.
2. First message creates an assistant session, then sends the message.
3. Voice capture uses browser `SpeechRecognition` / `webkitSpeechRecognition`; support and permissions depend on the browser.
4. The assistant response is shown in the conversation. Proposed actions display their exact arguments and approval controls.
5. Approve/reject posts a decision to the backend. The UI explicitly states that approval is only recorded and does not execute an action.

## Not included

- Background microphone listening or wake-word activation.
- Guaranteed speech recognition on every browser/device.
- Desktop companion, device pairing, WebSocket streaming, or actual browser/desktop execution.
- Replacing or modifying the Job Hunter orb.

## Verification

Frontend build and browser interaction tests have **not** been run in the user's local environment. After pulling the branch:

```powershell
cd frontend
npm install
npm run build
npm run dev
```

Verify owner login, opening the new lower-left orb, typed request, voice permission flow, proposal rendering, approval/rejection, and that the lower-right Job Hunter still works independently. The backend must have `OPENAI_API_KEY` configured for natural-language planning.
