const { prisma } = require("../lib/prisma");
const { verifyAccessToken } = require("../lib/token");
const ApiError = require("../utils/api-error");

async function authenticate(req, _res, next) {
  try {
    const authorization = req.headers.authorization || "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return next(new ApiError(401, "Access token is missing."));
    }

    const payload = verifyAccessToken(token);
    const userId = payload.sub;

    if (!userId) {
      return next(new ApiError(401, "Access token payload is invalid."));
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return next(new ApiError(401, "Authenticated user was not found."));
    }

    req.auth = {
      sessionId: payload.sessionId,
      userId,
    };
    req.user = user;

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { authenticate };
