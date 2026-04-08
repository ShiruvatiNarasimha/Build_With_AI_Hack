const express = require("express");

const { validate } = require("../../middlewares/validate.middleware");
const {
  googleAuth,
  logout,
  me,
  refreshAuth,
} = require("./auth.controller");
const { googleAuthSchema } = require("./auth.validation");

const router = express.Router();

router.post("/google", validate(googleAuthSchema), googleAuth);
router.post("/refresh", refreshAuth);
router.post("/logout", logout);
router.get("/me", ...me);

module.exports = router;
