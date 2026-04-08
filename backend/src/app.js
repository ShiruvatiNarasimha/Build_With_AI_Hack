const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const { env } = require("./config/env");
const ApiError = require("./utils/api-error");
const apiRoutes = require("./routes");
const {
  errorHandler,
  notFoundHandler,
} = require("./middlewares/error.middleware");

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || env.CLIENT_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(new ApiError(403, "CORS origin is not allowed."));
    },
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Crux backend is running.",
  });
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "API is healthy.",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app };
