const app = require("./app");

// Vercel invokes `src/app.js` directly; `server.js` is only for local `npm start`.
if (!process.env.VERCEL) {
  const { env } = require("./config/env");
  const { prisma } = require("./lib/prisma");

  const server = app.listen(env.PORT, () => {
    console.log(`Backend server is running on http://localhost:${env.PORT}`);
  });

  async function shutdown(signal) {
    console.log(`${signal} received. Shutting down backend gracefully...`);

    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });

    setTimeout(() => {
      process.exit(1);
    }, 10_000).unref();
  }

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

module.exports = app;
