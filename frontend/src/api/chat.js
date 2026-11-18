/** Ask Suji API helpers. */
import { apiUrl } from "./config";

export async function sendChatMessage(message, conversationId = null) {
  const payload = { message };
  if (conversationId) payload.conversation_id = conversationId;
  const response = await fetch(apiUrl("/api/chat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || "Failed to send message to Ask Suji.");
  return data;
}

export async function getChatStatus() {
  const response = await fetch(apiUrl("/api/chat/status"));
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || "Chat backend is unavailable.");
  return data;
}

export async function getChatHistory(conversationId) {
  const response = await fetch(apiUrl(`/api/chat/${encodeURIComponent(conversationId)}/messages`));
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || "Conversation history is unavailable.");
  return data;
}
