const express = require("express");

const authRoutes = require("../modules/auth/auth.routes");
const agentsRoutes = require("../modules/agents/agents.routes");
const valuationSuiteRoutes = require("../modules/valuation-suite/valuation.routes");
const forexRoutes = require("../modules/forex/forex.routes");
const erpRoutes = require("../modules/erp/erp.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/agents", agentsRoutes);
router.use("/valuations", valuationSuiteRoutes);
router.use("/forex", forexRoutes);
router.use("/erp", erpRoutes);

module.exports = router;
