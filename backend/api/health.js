/**
 * Standalone health check: no env, Prisma, or Express app — avoids cold-start crashes
 * when diagnostic routes must work even if the rest of the stack fails to initialize.
 */
module.exports = (_req, res) => {
  res.status(200).json({
    success: true,
    message: "API is healthy.",
    timestamp: new Date().toISOString(),
  });
};
