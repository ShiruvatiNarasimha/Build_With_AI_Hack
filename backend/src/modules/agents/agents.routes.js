const express = require("express");

const { authenticate } = require("../../middlewares/auth.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { askValuation, askValuationStream } = require("./agents.controller");
const { askValuationSchema } = require("./agents.validation");

const router = express.Router();

router.post(
  "/valuation",
  authenticate,
  validate(askValuationSchema),
  askValuation,
);

router.post(
  "/valuation/stream",
  authenticate,
  validate(askValuationSchema),
  askValuationStream,
);

module.exports = router;
