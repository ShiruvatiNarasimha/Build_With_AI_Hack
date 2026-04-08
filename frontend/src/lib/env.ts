const fallbackApiBaseUrl = "http://localhost:5000/api";

export const clientEnv = Object.freeze({
  apiBaseUrl:
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
    fallbackApiBaseUrl,
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
});
