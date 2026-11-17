const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

async function request(path, token, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.detail || `Assistant request failed (${response.status}).`);
  }
  return payload;
}

export function listAssistantDevices(token) {
  return request("/api/assistant/devices", token);
}

export function createAssistantSession(token, inputMode = "voice", deviceId = null) {
  return request("/api/assistant/sessions", token, {
    method: "POST",
    body: JSON.stringify({ input_mode: inputMode, ...(deviceId ? { device_id: deviceId } : {}) }),
  });
}

export function sendAssistantMessage(token, sessionId, text, inputMode = "voice") {
  return request(`/api/assistant/sessions/${encodeURIComponent(sessionId)}/messages`, token, {
    method: "POST",
    body: JSON.stringify({ text, input_mode: inputMode }),
  });
}

export function decideAssistantAction(token, actionId, decision) {
  return request(`/api/assistant/actions/${encodeURIComponent(actionId)}/decision`, token, {
    method: "POST",
    body: JSON.stringify({ decision }),
  });
}
