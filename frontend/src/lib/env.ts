const fallbackApiBasePath = "/api";

function normalizeApiBaseUrl(url?: string): string {
  if (!url) {
    return fallbackApiBasePath;
  }

  try {
    const parsed = new URL(url);
    const normalizedPath = parsed.pathname.replace(/\/$/, "");
    return normalizedPath && normalizedPath !== "/" ? normalizedPath : fallbackApiBasePath;
  } catch {
    const trimmed = url.replace(/\/$/, "");

    if (!trimmed) {
      return fallbackApiBasePath;
    }

    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  }
}

export const clientEnv = Object.freeze({
  apiBaseUrl: normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL),
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
});
