const express = require("express");

const { authenticate } = require("../../middlewares/auth.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { getERPData, analyzeERP } = require("./erp.controller");
const { erpAnalyzeSchema } = require("./erp.validation");

const router = express.Router();

router.get("/data", authenticate, getERPData);

router.post(
  "/analyze",
  authenticate,
  validate(erpAnalyzeSchema),
  analyzeERP,
);

module.exports = router;
