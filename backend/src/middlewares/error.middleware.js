const { ZodError } = require("zod");

const ApiError = require("../utils/api-error");

function notFoundHandler(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(error, _req, res, _next) {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal server error.";
  let details = error.details;

  if (error instanceof ZodError) {
    statusCode = 400;
    message = "Request validation failed.";
    details = error.flatten();
  }

  // Avoid require("@prisma/client") at module load (breaks cold starts / health).
  if (error.name === "PrismaClientKnownRequestError" && error.code === "P2002") {
    statusCode = 409;
    message = "A record with this value already exists.";
    details = error.meta;
  }

  if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Authentication token is invalid or expired.";
  }

  if (error instanceof ApiError && error.details !== undefined) {
    details = error.details;
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details !== undefined ? { details } : {}),
    ...(process.env.NODE_ENV !== "production" && error.stack
      ? { stack: error.stack }
      : {}),
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
