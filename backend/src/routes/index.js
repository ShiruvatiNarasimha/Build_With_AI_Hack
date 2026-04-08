const express = require("express");

const authRoutes = require("../modules/auth/auth.routes");
const agentsRoutes = require("../modules/agents/agents.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/agents", agentsRoutes);

module.exports = router;
