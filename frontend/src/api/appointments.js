/** Submit an explicit consultation request; it remains pending until the owner confirms it. */
import { apiUrl } from "./config";

export async function submitAppointmentRequest(payload, idempotencyKey) {
  const response = await fetch(apiUrl("/api/appointments"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || "The consultation request could not be saved.");
  return data;
}
