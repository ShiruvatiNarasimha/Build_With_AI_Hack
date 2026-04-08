const asyncHandler = require("../../utils/async-handler");
const {
  createValuation,
  listValuations,
  getValuation,
  updateStep,
  deleteValuation,
  aiGenerateCompanyProfile,
  aiFindPeers,
  aiFetchFinancials,
  aiRunValuation,
} = require("./valuation.service");
const ApiError = require("../../utils/api-error");

/* ──────────────────── CRUD ──────────────────── */

const create = asyncHandler(async (req, res) => {
  const { name } = req.validated?.body || req.body;
  const valuation = await createValuation(req.auth.userId, name);

  res.status(201).json({
    success: true,
    message: "Valuation created.",
    data: valuation,
  });
});

const list = asyncHandler(async (req, res) => {
  const valuations = await listValuations(req.auth.userId);

  res.status(200).json({
    success: true,
    data: valuations,
  });
});

const getById = asyncHandler(async (req, res) => {
  const valuation = await getValuation(
    req.validated.params.id,
    req.auth.userId,
  );

  if (!valuation) throw new ApiError(404, "Valuation not found.");

  res.status(200).json({
    success: true,
    data: valuation,
  });
});

const update = asyncHandler(async (req, res) => {
  const { id, step } = req.validated.params;
  const { data, markComplete } = req.validated.body;

  const valuation = await updateStep(
    id,
    req.auth.userId,
    step,
    data,
    markComplete,
  );

  if (!valuation) throw new ApiError(404, "Valuation not found.");

  res.status(200).json({
    success: true,
    message: `Step ${step} updated.`,
    data: valuation,
  });
});

const remove = asyncHandler(async (req, res) => {
  const valuation = await deleteValuation(
    req.validated.params.id,
    req.auth.userId,
  );

  if (!valuation) throw new ApiError(404, "Valuation not found.");

  res.status(200).json({
    success: true,
    message: "Valuation deleted.",
  });
});

/* ──────────────────── AI Streaming Endpoints ──────────────────── */

function createStreamHandler(agentFn, paramExtractor) {
  return asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const params = paramExtractor(req);

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();

    const sendEvent = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    req.on("close", () => {
      res.end();
    });

    try {
      const result = await agentFn(id, req.auth.userId, params, (step) => {
        sendEvent("step", step);
      });

      sendEvent("complete", result);
    } catch (error) {
      sendEvent("error", {
        message:
          error.message || "An unexpected error occurred during processing.",
      });
    }

    res.end();
  });
}

const aiCompanyProfile = createStreamHandler(
  aiGenerateCompanyProfile,
  (req) => req.validated.body,
);

const aiPeers = createStreamHandler(aiFindPeers, (req) => req.validated.body);

const aiFinancials = createStreamHandler(
  aiFetchFinancials,
  (req) => req.validated.body,
);

const aiValuation = createStreamHandler(
  aiRunValuation,
  (req) => req.validated.body,
);

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
  aiCompanyProfile,
  aiPeers,
  aiFinancials,
  aiValuation,
};
