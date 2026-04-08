const express = require("express");

const { authenticate } = require("../../middlewares/auth.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const controller = require("./valuation.controller");
const {
  createValuationSchema,
  updateStepSchema,
  getValuationSchema,
  aiCompanyProfileSchema,
  aiPeerFinderSchema,
  aiFinancialsSchema,
  aiValuationSchema,
} = require("./valuation.validation");

const router = express.Router();

router.post("/", authenticate, validate(createValuationSchema), controller.create);
router.get("/", authenticate, controller.list);
router.get("/:id", authenticate, validate(getValuationSchema), controller.getById);
router.put("/:id/step/:step", authenticate, validate(updateStepSchema), controller.update);
router.delete("/:id", authenticate, validate(getValuationSchema), controller.remove);

router.post("/:id/ai/company-profile", authenticate, validate(aiCompanyProfileSchema), controller.aiCompanyProfile);
router.post("/:id/ai/peers", authenticate, validate(aiPeerFinderSchema), controller.aiPeers);
router.post("/:id/ai/financials", authenticate, validate(aiFinancialsSchema), controller.aiFinancials);
router.post("/:id/ai/valuation", authenticate, validate(aiValuationSchema), controller.aiValuation);

module.exports = router;
