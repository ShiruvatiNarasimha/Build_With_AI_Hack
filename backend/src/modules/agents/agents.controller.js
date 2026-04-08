const asyncHandler = require("../../utils/async-handler");
const {
  askValuationQuestion,
  askValuationQuestionStream,
} = require("./agents.service");

const askValuation = asyncHandler(async (req, res) => {
  const { question } = req.validated.body;

  const result = await askValuationQuestion(question);

  res.status(200).json({
    success: true,
    message: "Valuation agent response generated successfully.",
    data: result,
  });
});

const askValuationStream = asyncHandler(async (req, res) => {
  const { question } = req.validated.body;

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
    const result = await askValuationQuestionStream(question, (step) => {
      sendEvent("step", step);
    });

    sendEvent("complete", result);
  } catch (error) {
    sendEvent("error", {
      message: error.message || "An unexpected error occurred during streaming.",
    });
  }

  res.end();
});

module.exports = {
  askValuation,
  askValuationStream,
};
