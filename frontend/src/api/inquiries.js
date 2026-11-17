/**
 * Helper functions to communicate with FastAPI /api/inquiries backend.
 */
import { apiUrl } from "./config";

export async function submitInquiry(inquiryData) {
  const response = await fetch(apiUrl("/api/inquiries"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(inquiryData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to submit inquiry.");
  }

  return await response.json();
}

export async function fetchInquiries() {
  const response = await fetch(apiUrl("/api/inquiries"));
  if (!response.ok) {
    throw new Error("Failed to fetch inquiries.");
  }
  return await response.json();
}
