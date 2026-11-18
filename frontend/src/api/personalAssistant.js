import { apiUrl } from "./config";

async function request(path, token, options = {}) {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

// Workflow Orchestrator API
export function startWorkflow(token, goal, deviceId = null, allowedDomains = null) {
  return request("/api/assistant/workflows", token, {
    method: "POST",
    body: JSON.stringify({
      goal,
      ...(deviceId ? { device_id: deviceId } : {}),
      ...(allowedDomains ? { allowed_domains: allowedDomains } : {}),
    }),
  });
}

export function getWorkflow(token, workflowId) {
  return request(`/api/assistant/workflows/${encodeURIComponent(workflowId)}`, token);
}

export function listWorkflows(token) {
  return request("/api/assistant/workflows", token);
}

export function advanceWorkflow(token, workflowId) {
  return request(`/api/assistant/workflows/${encodeURIComponent(workflowId)}/advance`, token, {
    method: "POST",
  });
}

export function pauseWorkflow(token, workflowId) {
  return request(`/api/assistant/workflows/${encodeURIComponent(workflowId)}/pause`, token, {
    method: "POST",
  });
}

export function resumeWorkflow(token, workflowId) {
  return request(`/api/assistant/workflows/${encodeURIComponent(workflowId)}/resume`, token, {
    method: "POST",
  });
}

export function cancelWorkflow(token, workflowId) {
  return request(`/api/assistant/workflows/${encodeURIComponent(workflowId)}/cancel`, token, {
    method: "POST",
  });
}

export function getWorkflowEvents(token, workflowId) {
  return request(`/api/assistant/workflows/${encodeURIComponent(workflowId)}/events`, token);
}

// Work Profile API
export function getWorkProfile(token) {
  return request("/api/assistant/profile", token);
}

export function updateWorkProfile(token, profileData) {
  return request("/api/assistant/profile", token, {
    method: "PUT",
    body: JSON.stringify(profileData),
  });
}

// Trusted Device Auth API
export function pairDevice(token, name, pin = null) {
  return request("/api/assistant/auth/pair", token, {
    method: "POST",
    body: JSON.stringify({ name, ...(pin ? { pin } : {}) }),
  });
}

export function unlockDevice(deviceId, pin) {
  return request("/api/assistant/auth/unlock", null, {
    method: "POST",
    body: JSON.stringify({ device_id: deviceId, pin }),
  });
}
