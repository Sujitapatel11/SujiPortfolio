/**
 * Single source of truth for the FastAPI origin.
 *
 * VITE_API_URL is the backend origin only, e.g. https://api.example.com.
 * Do not include /api or a trailing slash.
 */
const configuredOrigin = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");

if (import.meta.env.PROD && !configuredOrigin) {
  throw new Error("VITE_API_URL is required in production and must point to the deployed FastAPI origin.");
}

if (configuredOrigin) {
  let parsedOrigin;
  try {
    parsedOrigin = new URL(configuredOrigin);
  } catch {
    throw new Error("VITE_API_URL must be a valid absolute URL.");
  }
  if (parsedOrigin.origin !== configuredOrigin || (import.meta.env.PROD && parsedOrigin.protocol !== "https:")) {
    throw new Error("VITE_API_URL must be an origin only (no path/query/hash) and use HTTPS in production.");
  }
}

export const API_ORIGIN = configuredOrigin || "http://localhost:8000";

export function apiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_ORIGIN}${normalizedPath}`;
}
