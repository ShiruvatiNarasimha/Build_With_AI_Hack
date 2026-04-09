const asyncHandler = require("../../utils/async-handler");
const {
  fetchForexPairs,
  fetchForexHistoricalData,
  analyzeFxStream,
} = require("./forex.service");

const getForexPairs = asyncHandler(async (_req, res) => {
  const { pairs, error } = await fetchForexPairs();

  if (error && pairs.length === 0) {
    return res.status(502).json({
      success: false,
      message: error,
      data: [],
    });
  }

  res.status(200).json({
    success: true,
    message: `Retrieved ${pairs.length} forex pairs.`,
    data: pairs,
  });
});

const getForexHistorical = asyncHandler(async (req, res) => {
  const { symbol, from, to } = req.validated.query;

  const { history, error } = await fetchForexHistoricalData(symbol, from, to);

  if (error && history.length === 0) {
    return res.status(502).json({
      success: false,
      message: error,
      data: [],
    });
  }

  res.status(200).json({
    success: true,
    message: `Retrieved ${history.length} data points for ${symbol}.`,
    data: history,
  });
});

const analyzeForex = asyncHandler(async (req, res) => {
  const { pairs, context, dealCurrency, targetCurrency, dealSize, question } =
    req.validated.body;

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
    const result = await analyzeFxStream(
      { pairs, context, dealCurrency, targetCurrency, dealSize, question },
      (step) => sendEvent("step", step),
    );
    sendEvent("complete", result);
  } catch (error) {
    sendEvent("error", {
      message:
        error.message || "An unexpected error occurred during FX analysis.",
    });
  }

  res.end();
});

module.exports = {
  getForexPairs,
  getForexHistorical,
  analyzeForex,
};
