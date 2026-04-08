const crypto = require("crypto");

const { OAuth2Client } = require("google-auth-library");

const { env } = require("../../config/env");
const { prisma } = require("../../lib/prisma");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("../../lib/token");
const ApiError = require("../../utils/api-error");
const { durationToMilliseconds } = require("../../utils/duration");
const { hashToken } = require("../../utils/hash");

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

async function signInWithGoogle({ idToken, userAgent, ipAddress }) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email) {
    throw new ApiError(401, "Invalid Google identity token.");
  }

  if (!payload.email_verified) {
    throw new ApiError(401, "Google account email must be verified.");
  }

  const user = await prisma.$transaction((tx) =>
    findOrCreateGoogleUser(tx, {
      avatarUrl: payload.picture || null,
      email: payload.email.toLowerCase(),
      emailVerified: Boolean(payload.email_verified),
      googleAccountId: payload.sub,
      name: payload.name || null,
    }),
  );

  const session = await createSession({
    email: user.email,
    ipAddress,
    userAgent,
    userId: user.id,
  });

  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: serializeUser(user),
  };
}

async function rotateRefreshSession({ refreshToken, userAgent, ipAddress }) {
  if (!refreshToken) {
    throw new ApiError(401, "Refresh token is missing.");
  }

  const payload = verifyRefreshToken(refreshToken);

  if (!payload?.sessionId || !payload?.sub) {
    throw new ApiError(401, "Refresh token payload is invalid.");
  }

  const existingSession = await prisma.session.findUnique({
    where: { id: payload.sessionId },
    include: { user: true },
  });

  if (!existingSession || existingSession.userId !== payload.sub) {
    throw new ApiError(401, "Refresh token is invalid.");
  }

  if (existingSession.revokedAt || existingSession.expiresAt <= new Date()) {
    throw new ApiError(401, "Refresh token has expired.");
  }

  if (existingSession.refreshTokenHash !== hashToken(refreshToken)) {
    await prisma.session.update({
      where: { id: existingSession.id },
      data: { revokedAt: new Date() },
    });

    throw new ApiError(401, "Refresh token is invalid.");
  }

  const nextSessionId = crypto.randomUUID();
  const refreshExpiresAt = new Date(
    Date.now() + durationToMilliseconds(env.REFRESH_TOKEN_EXPIRES_IN),
  );
  const nextAccessToken = signAccessToken({
    email: existingSession.user.email,
    sessionId: nextSessionId,
    sub: existingSession.user.id,
  });
  const nextRefreshToken = signRefreshToken({
    sessionId: nextSessionId,
    sub: existingSession.user.id,
  });

  await prisma.$transaction([
    prisma.session.update({
      where: { id: existingSession.id },
      data: { revokedAt: new Date() },
    }),
    prisma.session.create({
      data: {
        expiresAt: refreshExpiresAt,
        id: nextSessionId,
        ipAddress: ipAddress || existingSession.ipAddress,
        refreshTokenHash: hashToken(nextRefreshToken),
        userAgent: userAgent || existingSession.userAgent,
        userId: existingSession.userId,
      },
    }),
  ]);

  return {
    accessToken: nextAccessToken,
    refreshToken: nextRefreshToken,
    user: serializeUser(existingSession.user),
  };
}

async function revokeRefreshSession(refreshToken) {
  if (!refreshToken) {
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);

    if (!payload?.sessionId) {
      return;
    }

    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
    });

    if (!session || session.refreshTokenHash !== hashToken(refreshToken)) {
      return;
    }

    if (session.revokedAt) {
      return;
    }

    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
  } catch (_error) {
    return;
  }
}

async function getAuthenticatedUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  return serializeUser(user);
}

async function findOrCreateGoogleUser(tx, profile) {
  const existingAccount = await tx.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: "GOOGLE",
        providerAccountId: profile.googleAccountId,
      },
    },
    include: {
      user: true,
    },
  });

  if (existingAccount) {
    return tx.user.update({
      where: { id: existingAccount.userId },
      data: {
        avatarUrl: profile.avatarUrl,
        emailVerified: profile.emailVerified,
        lastLoginAt: new Date(),
        name: profile.name,
      },
    });
  }

  const existingUser = await tx.user.findUnique({
    where: { email: profile.email },
    include: {
      accounts: {
        where: { provider: "GOOGLE" },
      },
    },
  });

  if (existingUser?.accounts.length) {
    throw new ApiError(
      409,
      "This email is already linked to a different Google account.",
    );
  }

  const user = existingUser
    ? await tx.user.update({
        where: { id: existingUser.id },
        data: {
          avatarUrl: profile.avatarUrl,
          emailVerified: profile.emailVerified || existingUser.emailVerified,
          lastLoginAt: new Date(),
          name: profile.name || existingUser.name,
        },
      })
    : await tx.user.create({
        data: {
          avatarUrl: profile.avatarUrl,
          email: profile.email,
          emailVerified: profile.emailVerified,
          lastLoginAt: new Date(),
          name: profile.name,
        },
      });

  await tx.account.create({
    data: {
      provider: "GOOGLE",
      providerAccountId: profile.googleAccountId,
      userId: user.id,
    },
  });

  return user;
}

async function createSession({ userId, email, userAgent, ipAddress }) {
  const sessionId = crypto.randomUUID();
  const refreshExpiresAt = new Date(
    Date.now() + durationToMilliseconds(env.REFRESH_TOKEN_EXPIRES_IN),
  );
  const accessToken = signAccessToken({
    email,
    sessionId,
    sub: userId,
  });
  const refreshToken = signRefreshToken({
    sessionId,
    sub: userId,
  });

  await prisma.session.create({
    data: {
      expiresAt: refreshExpiresAt,
      id: sessionId,
      ipAddress,
      refreshTokenHash: hashToken(refreshToken),
      userAgent,
      userId,
    },
  });

  return {
    accessToken,
    refreshToken,
  };
}

function serializeUser(user) {
  return {
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    email: user.email,
    emailVerified: user.emailVerified,
    id: user.id,
    lastLoginAt: user.lastLoginAt,
    name: user.name,
    updatedAt: user.updatedAt,
  };
}

module.exports = {
  getAuthenticatedUser,
  revokeRefreshSession,
  rotateRefreshSession,
  signInWithGoogle,
};
