/**
 * Helper function to communicate with FastAPI AI Chat Agent endpoint.
 */

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export async function sendChatMessage(message, conversationId = null, accessToken = null) {
  const payload = { message };
  if (conversationId) {
    payload.conversation_id = conversationId;
  }

  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to send message to AI agent.');
  }

  return await response.json();
}
