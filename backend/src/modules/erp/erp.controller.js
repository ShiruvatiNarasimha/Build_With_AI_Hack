const asyncHandler = require("../../utils/async-handler");
const { fetchERPData, analyzeErpStream } = require("./erp.service");

const getERPData = asyncHandler(async (_req, res) => {
  const { data, error } = await fetchERPData();

  if (error && data.length === 0) {
    return res.status(502).json({
      success: false,
      message: error,
      data: [],
    });
  }

  res.status(200).json({
    success: true,
    message: `Retrieved ERP data for ${data.length} countries.`,
    data,
  });
});

const analyzeERP = asyncHandler(async (req, res) => {
  const { countries, context, dealCountry, targetCountry, sector, question } =
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
    const result = await analyzeErpStream(
      { countries, context, dealCountry, targetCountry, sector, question },
      (step) => sendEvent("step", step),
    );
    sendEvent("complete", result);
  } catch (error) {
    sendEvent("error", {
      message:
        error.message || "An unexpected error occurred during ERP analysis.",
    });
  }

  res.end();
});

module.exports = {
  getERPData,
  analyzeERP,
};
