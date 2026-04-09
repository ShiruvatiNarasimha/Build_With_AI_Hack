const fallbackApiBaseUrl = "http://localhost:5000/api";

function normalizeApiBaseUrl(url: string): string {
  const trimmed = url.replace(/\/$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

export const clientEnv = Object.freeze({
  apiBaseUrl:
    normalizeApiBaseUrl(
      process.env.NEXT_PUBLIC_API_BASE_URL || fallbackApiBaseUrl,
    ),
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
});
