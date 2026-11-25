/**
 * FastAPI chat client with a bounded cold-start wait for sleeping free-tier hosts.
 */
import { apiUrl } from "./config";

export async function sendChatMessage(message, conversationId = null) {
  const payload = { message };
  if (conversationId) {
    payload.conversation_id = conversationId;
  }

  const response = await fetch(apiUrl("/api/chat"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to send message to AI agent.");
  }

  return await response.json();
}


const HEALTH_CHECK_TIMEOUT_MS = 8000;
const BACKEND_WAKE_WINDOW_MS = 75000;
const BACKEND_RETRY_INTERVAL_MS = 3000;

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function waitForChatBackend(onStatus = () => {}) {
  const startedAt = Date.now();
  let attempt = 0;
  while (Date.now() - startedAt < BACKEND_WAKE_WINDOW_MS) {
    attempt += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
    try {
      const response = await fetch(apiUrl("/api/health"), {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      if (response.ok) {
        const health = await response.json().catch(() => ({}));
        if (health.status === "ok") return health;
      }
      onStatus({ state: "waking", attempt });
    } catch {
      onStatus({ state: "waking", attempt });
    } finally {
      clearTimeout(timeout);
    }
    await pause(BACKEND_RETRY_INTERVAL_MS);
  }
  throw new Error("The portfolio API did not wake up within 75 seconds. Please retry; the host may be sleeping or unavailable.");
}
