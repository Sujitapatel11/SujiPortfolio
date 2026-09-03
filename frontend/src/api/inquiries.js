/**
 * Helper functions to communicate with FastAPI /api/inquiries backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function submitInquiry(inquiryData) {
  const response = await fetch(`${API_BASE}/inquiries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(inquiryData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to submit inquiry.');
  }

  return await response.json();
}

export async function fetchInquiries() {
  const response = await fetch(`${API_BASE}/inquiries`);
  if (!response.ok) {
    throw new Error('Failed to fetch inquiries.');
  }
  return await response.json();
}
