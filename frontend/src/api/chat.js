/**
 * Helper function to communicate with FastAPI AI Chat Agent endpoint.
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
