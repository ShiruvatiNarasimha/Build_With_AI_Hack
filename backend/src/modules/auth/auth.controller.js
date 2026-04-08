const asyncHandler = require("../../utils/async-handler");
const { env } = require("../../config/env");
const { authenticate } = require("../../middlewares/auth.middleware");
const {
  clearRefreshTokenCookie,
  setRefreshTokenCookie,
} = require("../../utils/cookie");
const {
  getAuthenticatedUser,
  revokeRefreshSession,
  rotateRefreshSession,
  signInWithGoogle,
} = require("./auth.service");

const googleAuth = asyncHandler(async (req, res) => {
  const { idToken } = req.validated.body;

  const result = await signInWithGoogle({
    idToken,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  setRefreshTokenCookie(res, result.refreshToken);

  res.status(200).json({
    success: true,
    message: "Google authentication successful.",
    data: {
      accessToken: result.accessToken,
      user: result.user,
    },
  });
});

const refreshAuth = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[env.REFRESH_TOKEN_COOKIE_NAME];

  const result = await rotateRefreshSession({
    ipAddress: req.ip,
    refreshToken,
    userAgent: req.get("user-agent"),
  });

  setRefreshTokenCookie(res, result.refreshToken);

  res.status(200).json({
    success: true,
    message: "Authentication session refreshed.",
    data: {
      accessToken: result.accessToken,
      user: result.user,
    },
  });
});

const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[env.REFRESH_TOKEN_COOKIE_NAME];

  await revokeRefreshSession(refreshToken);
  clearRefreshTokenCookie(res);

  res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
});

const me = [
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await getAuthenticatedUser(req.auth.userId);

    res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  }),
];

module.exports = {
  googleAuth,
  logout,
  me,
  refreshAuth,
};
