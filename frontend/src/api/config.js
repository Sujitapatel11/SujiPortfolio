/**
 * Single source of truth for the FastAPI origin.
 *
 * VITE_API_URL is the backend origin only, e.g. https://api.example.com.
 * Do not include /api or a trailing slash.
 */
const configuredOrigin = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");

export const API_ORIGIN = configuredOrigin || (import.meta.env.DEV ? "http://localhost:8000" : "");

export function apiUrl(path) {
  if (!API_ORIGIN && !import.meta.env.DEV) {
    throw new Error("VITE_API_URL is not configured. Set it to the deployed FastAPI origin.");
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_ORIGIN}${normalizedPath}`;
}
