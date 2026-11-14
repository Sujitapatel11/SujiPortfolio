const COMPANION_BASE = "http://127.0.0.1:8765";

async function companionRequest(path, { token, method = "GET", body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response;
  try {
    response = await fetch(`${COMPANION_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      referrerPolicy: "strict-origin",
    });
  } catch {
    throw new Error("Cannot reach the local companion. Start it on this computer, allow the browser's localhost/private-network prompt if shown, and try again.");
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const messages = {
      401: "Pairing challenge or device session is invalid.",
      403: "This website origin is not trusted by the companion. Configure ASSISTANT_ALLOWED_ORIGINS with this exact website origin.",
      410: "The pairing challenge expired or was already used. Restart the companion and use its new challenge.",
      429: "Too many pairing attempts. Restart the companion to generate a new challenge.",
    };
    throw new Error(messages[response.status] || payload.detail || `Companion request failed (${response.status}).`);
  }
  return payload;
}

export function pairLocalCompanion(challenge) {
  return companionRequest("/v1/pairing/complete", {
    method: "POST",
    body: { challenge },
  });
}

export function getLocalCompanionCapabilities(token) {
  return companionRequest("/v1/capabilities", { token });
}

export function disconnectLocalCompanion(token) {
  return companionRequest("/v1/pairing/disconnect", {
    token,
    method: "POST",
    body: {},
  });
}

export function checkLocalCompanion() {
  return companionRequest("/health");
}
