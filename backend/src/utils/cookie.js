const { env } = require("../config/env");
const { durationToMilliseconds } = require("./duration");

function getRefreshTokenCookieOptions() {
  const isProduction = env.NODE_ENV === "production";

  return {
    httpOnly: true,
    maxAge: durationToMilliseconds(env.REFRESH_TOKEN_EXPIRES_IN),
    path: "/api/auth",
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

function setRefreshTokenCookie(res, refreshToken) {
  res.cookie(
    env.REFRESH_TOKEN_COOKIE_NAME,
    refreshToken,
    getRefreshTokenCookieOptions(),
  );
}

function clearRefreshTokenCookie(res) {
  res.clearCookie(env.REFRESH_TOKEN_COOKIE_NAME, {
    ...getRefreshTokenCookieOptions(),
    maxAge: undefined,
  });
}

module.exports = {
  clearRefreshTokenCookie,
  getRefreshTokenCookieOptions,
  setRefreshTokenCookie,
};
