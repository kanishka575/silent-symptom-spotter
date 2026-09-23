const DEFAULT_API_BASE = "https://silent-symptom-spotter.onrender.com/api";

export const API_BASE = (
  import.meta.env.VITE_API_URL || DEFAULT_API_BASE
).replace(/\/$/, "");

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let message = "Unexpected error";
    const rawText = await response.text();

    if (rawText) {
      try {
        const payload = JSON.parse(rawText);
        message = payload.message || payload.error || message;
      } catch {
        message = rawText;
      }
    }

    throw new Error(message);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return {};
}
