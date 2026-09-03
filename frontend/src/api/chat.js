/**
 * Helper functions to communicate with FastAPI AI Chat Agent endpoint.
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function sendChatMessage(message, sessionId = 'default_session') {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, session_id: sessionId }),
  });

  if (!response.ok) {
    throw new Error('Failed to send message to AI agent.');
  }

  return await response.json();
}
