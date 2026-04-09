const express = require("express");

const { authenticate } = require("../../middlewares/auth.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const {
  getForexPairs,
  getForexHistorical,
  analyzeForex,
} = require("./forex.controller");
const {
  forexHistoricalSchema,
  forexAnalyzeSchema,
} = require("./forex.validation");

const router = express.Router();

router.get("/pairs", authenticate, getForexPairs);

router.get(
  "/historical",
  authenticate,
  validate(forexHistoricalSchema),
  getForexHistorical,
);

router.post(
  "/analyze",
  authenticate,
  validate(forexAnalyzeSchema),
  analyzeForex,
);

module.exports = router;
