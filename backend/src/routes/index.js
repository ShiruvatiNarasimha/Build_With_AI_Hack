const express = require("express");

const authRoutes = require("../modules/auth/auth.routes");
const agentsRoutes = require("../modules/agents/agents.routes");
const valuationSuiteRoutes = require("../modules/valuation-suite/valuation.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/agents", agentsRoutes);
router.use("/valuations", valuationSuiteRoutes);

module.exports = router;
