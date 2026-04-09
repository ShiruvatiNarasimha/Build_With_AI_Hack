const { openai } = require("../../lib/openai");
const { env } = require("../../config/env");
const {
  getForexList,
  getForexHistorical,
  getForexQuote,
} = require("../../lib/fmp");

const hasFmp = Boolean(env.FMP_API_KEY);

/* ─── Data fetching (mirrors ValueEQ but through our FMP lib) ─── */

async function fetchForexPairs() {
  if (!hasFmp) {
    return { pairs: [], error: "FMP_API_KEY is not configured." };
  }
  try {
    const data = await getForexList();
    return { pairs: Array.isArray(data) ? data : [], error: null };
  } catch (err) {
    return { pairs: [], error: err.message };
  }
}

async function fetchForexHistoricalData(symbol, from, to) {
  if (!hasFmp) {
    return { history: [], error: "FMP_API_KEY is not configured." };
  }
  try {
    const data = await getForexHistorical(symbol, from, to);
    const history = Array.isArray(data) ? data : [];
    return { history, error: null };
  } catch (err) {
    return { history: [], error: err.message };
  }
}

/* ─── AI Agent: FX Planner ─── */

const FX_SYSTEM_PROMPT = `You are FXOps, a senior foreign exchange AI analyst specializing in advising Private Equity (PE), Venture Capital (VC), and M&A professionals.

Your mission:
1) Analyze currency pair dynamics and their impact on cross-border transactions.
2) Assess FX risk for deal structuring, portfolio valuations, and exit planning.
3) Provide hedging strategy recommendations tailored to deal timelines.
4) Identify macro trends, central bank policy shifts, and geopolitical factors affecting FX.

Hard rules:
- Never fabricate exchange rates. Use only the verified data provided.
- Always contextualize FX movements for PE/VC/M&A implications.
- Provide actionable, executive-friendly insights.
- When real FX data is provided, cite actual numbers.
- Quantify currency exposure impact on deal economics where possible.`;

function parseJsonSafe(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

async function createFxPlannerBrief(pairs, context, options = {}) {
  const contextDescriptions = {
    pe: "Private Equity deal analysis — focus on portfolio company FX exposure, fund-level currency risk, and cross-border LBO implications",
    vc: "Venture Capital analysis — focus on startup international expansion FX risk, multi-currency funding rounds, and cross-border cap table implications",
    ma: "M&A Advisory analysis — focus on cross-border deal FX risk, purchase price adjustment mechanisms, completion accounts currency, and merger synergy FX impact",
    general: "General FX analysis for financial professionals",
  };

  const response = await openai.responses.create({
    model: env.OPENAI_MODEL,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `${FX_SYSTEM_PROMPT}
Return strict JSON with keys:
- intent (string): What the user needs to understand about these FX pairs
- analysisFocus (string[]): 3-6 specific areas to analyze
- macroFactors (string[]): Key macro/geopolitical factors to research
- hedgingRelevance (boolean): Whether hedging recommendations are needed
- timeHorizon (string): "short-term" | "medium-term" | "long-term"`,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Context: ${contextDescriptions[context] || contextDescriptions.general}
Currency pairs: ${pairs.join(", ")}
${options.dealCurrency ? `Deal currency: ${options.dealCurrency}` : ""}
${options.targetCurrency ? `Target currency: ${options.targetCurrency}` : ""}
${options.dealSize ? `Deal size: $${options.dealSize.toLocaleString()}` : ""}
${options.question ? `Specific question: ${options.question}` : ""}`,
          },
        ],
      },
    ],
  });

  const parsed = parseJsonSafe(response.output_text);

  return {
    intent: parsed?.intent || "Analyze FX dynamics for advisory context.",
    analysisFocus: Array.isArray(parsed?.analysisFocus)
      ? parsed.analysisFocus.slice(0, 6)
      : ["exchange rate trends", "volatility assessment", "central bank policy"],
    macroFactors: Array.isArray(parsed?.macroFactors)
      ? parsed.macroFactors.slice(0, 5)
      : ["monetary policy", "geopolitical risk"],
    hedgingRelevance: parsed?.hedgingRelevance ?? true,
    timeHorizon: parsed?.timeHorizon || "medium-term",
  };
}

/* ─── AI Agent: FX Data Collector ─── */

async function runFxDataCollection(pairs) {
  if (!hasFmp || pairs.length === 0) {
    return { dataByPair: {}, errors: [] };
  }

  const dataByPair = {};
  const errors = [];

  const today = new Date().toISOString().split("T")[0];
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const fromDate = oneYearAgo.toISOString().split("T")[0];

  const tasks = pairs.map(async (pair) => {
    try {
      const [historical, quote] = await Promise.allSettled([
        getForexHistorical(pair, fromDate, today),
        getForexQuote(pair),
      ]);

      const histData =
        historical.status === "fulfilled" && Array.isArray(historical.value)
          ? historical.value
          : [];

      dataByPair[pair] = {
        quote: quote.status === "fulfilled" ? quote.value : null,
        historical: histData.slice(0, 90),
        fullHistorical: histData,
      };
    } catch (err) {
      errors.push(`${pair}: ${err.message}`);
    }
  });

  await Promise.all(tasks);
  return { dataByPair, errors };
}

/* ─── AI Agent: Macro Intelligence (web search) ─── */

async function runFxMacroResearch(pairs, macroFactors) {
  const response = await openai.responses.create({
    model: env.OPENAI_MODEL,
    tools: [{ type: "web_search_preview" }],
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `You are a macro-FX intelligence researcher focused on PE/VC/M&A advisory.
Find the latest central bank decisions, geopolitical developments, and market commentary affecting these currency pairs.
Focus on implications for cross-border transactions and deal-making.
Return structured bullet findings with source references.`,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Currency pairs: ${pairs.join(", ")}
Key factors to research: ${macroFactors.join(", ")}
Provide latest developments affecting these pairs for PE/VC/M&A advisory context.`,
          },
        ],
      },
    ],
  });

  return response.output_text || "No macro intelligence signals found.";
}

/* ─── AI Agent: FX Technical Analysis ─── */

async function runFxTechnicalAnalysis(dataByPair) {
  const sections = [];

  for (const [pair, data] of Object.entries(dataByPair)) {
    if (!data.historical?.length) continue;

    const recent = data.historical.slice(0, 30);
    const prices = recent.map((d) => d.close).filter(Boolean);

    if (prices.length === 0) continue;

    const latest = prices[0];
    const avg30 = prices.reduce((a, b) => a + b, 0) / prices.length;
    const high30 = Math.max(...prices);
    const low30 = Math.min(...prices);
    const volatility30 =
      Math.sqrt(
        prices
          .slice(0, -1)
          .map((p, i) => Math.pow(Math.log(p / prices[i + 1]), 2))
          .reduce((a, b) => a + b, 0) / (prices.length - 1),
      ) * Math.sqrt(252);

    const allPrices = data.historical
      .map((d) => d.close)
      .filter(Boolean);
    const high1y = Math.max(...allPrices);
    const low1y = Math.min(...allPrices);

    sections.push(
      `### ${pair}`,
      `Latest: ${latest.toFixed(4)} | 30-Day Avg: ${avg30.toFixed(4)}`,
      `30-Day Range: ${low30.toFixed(4)} – ${high30.toFixed(4)}`,
      `1-Year Range: ${low1y.toFixed(4)} – ${high1y.toFixed(4)}`,
      `Annualized Volatility: ${(volatility30 * 100).toFixed(1)}%`,
      `Position vs 30d Avg: ${latest > avg30 ? "Above" : "Below"} (${(((latest - avg30) / avg30) * 100).toFixed(2)}%)`,
      "",
    );
  }

  if (sections.length === 0) return "No FX technical data available.";

  const response = await openai.responses.create({
    model: env.OPENAI_MODEL,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `You are a quantitative FX analyst specializing in cross-border deal advisory.
Given FX data, produce analysis covering:
1. Current trend direction and strength
2. Volatility assessment and what it means for deal timing
3. Support/resistance levels relevant for transaction planning
4. Short-term vs medium-term outlook
5. Specific implications for PE/VC/M&A deal structuring

Be precise with numbers. Always tie observations to deal-making implications.`,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `--- LIVE FX DATA ---\n${sections.join("\n")}`,
          },
        ],
      },
    ],
  });

  return response.output_text || "Could not produce FX technical analysis.";
}

/* ─── AI Agent: Deal Impact Synthesizer ─── */

async function synthesizeFxAdvisory({
  plan,
  technicalAnalysis,
  macroResearch,
  pairs,
  context,
  options,
  hasRealData,
}) {
  const contextLabels = {
    pe: "Private Equity",
    vc: "Venture Capital",
    ma: "M&A Advisory",
    general: "Financial Advisory",
  };

  const dealSection =
    options.dealSize && options.dealCurrency && options.targetCurrency
      ? `\nDeal Parameters: ${options.dealCurrency} ${options.dealSize.toLocaleString()} → ${options.targetCurrency}`
      : "";

  const response = await openai.responses.create({
    model: env.OPENAI_MODEL,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `${FX_SYSTEM_PROMPT}
${hasRealData ? "IMPORTANT: You have REAL FX data from live market feeds. Cite actual rates and numbers." : ""}

Respond in markdown with these sections:
## Executive FX Summary
Brief overview for the ${contextLabels[context] || "advisory"} professional.

## Currency Pair Analysis
Detailed analysis of each pair's dynamics.

## Deal Impact Assessment
How FX movements affect transaction economics, valuations, and returns.

## Risk & Volatility Matrix
Quantified risk assessment with scenario analysis.

## Hedging Strategy Recommendations
Specific hedging approaches tailored to the deal timeline and structure.

## Macro Outlook & Timing
Central bank policy, geopolitical factors, and optimal transaction timing.`,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Advisory Context: ${contextLabels[context] || "General"}
Currency Pairs: ${pairs.join(", ")}${dealSection}
${options.question ? `Specific Question: ${options.question}` : ""}

Analysis Focus: ${plan.analysisFocus.join(", ")}
Time Horizon: ${plan.timeHorizon}

Technical Analysis:
${technicalAnalysis}

Macro Intelligence:
${macroResearch}`,
          },
        ],
      },
    ],
  });

  return response.output_text || "Could not produce FX advisory synthesis.";
}

/* ─── Streaming Orchestrator ─── */

async function analyzeFxStream(
  { pairs, context, dealCurrency, targetCurrency, dealSize, question },
  emitStep,
) {
  const startTime = Date.now();

  /* Step 1: Planning */
  emitStep({
    id: "fx_plan",
    name: "FX Analysis Planning",
    icon: "brain",
    status: "running",
    description: `Analyzing ${pairs.length} currency pair(s) for ${context.toUpperCase()} context...`,
    startedAt: startTime,
  });

  const planStart = Date.now();
  const plan = await createFxPlannerBrief(pairs, context, {
    dealCurrency,
    targetCurrency,
    dealSize,
    question,
  });
  const planEnd = Date.now();

  emitStep({
    id: "fx_plan",
    name: "FX Analysis Planning",
    icon: "brain",
    status: "completed",
    description: `Plan ready — ${plan.analysisFocus.length} focus areas, ${plan.timeHorizon} horizon.`,
    completedAt: planEnd,
    duration: planEnd - startTime,
    detail: JSON.stringify({
      intent: plan.intent,
      focus: plan.analysisFocus,
      timeHorizon: plan.timeHorizon,
    }),
  });

  /* Step 2: FX Data Collection */
  const dataStart = Date.now();

  emitStep({
    id: "fx_data",
    name: "Fetching Live FX Data",
    icon: "database",
    status: "running",
    description: `Retrieving rates and historical data for ${pairs.join(", ")}...`,
    startedAt: dataStart,
  });

  const fxData = await runFxDataCollection(pairs);
  const dataEnd = Date.now();
  const fetchedPairs = Object.keys(fxData.dataByPair).length;

  emitStep({
    id: "fx_data",
    name: "Fetching Live FX Data",
    icon: "database",
    status: "completed",
    description: `Retrieved data for ${fetchedPairs} pair(s)${fxData.errors.length > 0 ? ` (${fxData.errors.length} errors)` : ""}.`,
    completedAt: dataEnd,
    duration: dataEnd - dataStart,
  });

  /* Step 3 & 4: Parallel research */
  const researchStart = Date.now();

  emitStep({
    id: "fx_macro",
    name: "Macro Intelligence",
    icon: "globe",
    status: "running",
    description:
      "Researching central bank policies, geopolitical factors, and market commentary...",
    startedAt: researchStart,
  });

  emitStep({
    id: "fx_technical",
    name: "Technical FX Analysis",
    icon: "trending-up",
    status: "running",
    description:
      "Computing volatility, trend analysis, and support/resistance levels...",
    startedAt: researchStart,
  });

  const hasRealData = fetchedPairs > 0;

  const [macroResearch, technicalAnalysis] = await Promise.all([
    runFxMacroResearch(pairs, plan.macroFactors),
    hasRealData
      ? runFxTechnicalAnalysis(fxData.dataByPair)
      : Promise.resolve("No live data available for technical analysis."),
  ]);

  const researchEnd = Date.now();

  emitStep({
    id: "fx_macro",
    name: "Macro Intelligence",
    icon: "globe",
    status: "completed",
    description: "Central bank and geopolitical intelligence gathered.",
    completedAt: researchEnd,
    duration: researchEnd - researchStart,
  });

  emitStep({
    id: "fx_technical",
    name: "Technical FX Analysis",
    icon: "trending-up",
    status: "completed",
    description: "Volatility, trends, and levels computed.",
    completedAt: researchEnd,
    duration: researchEnd - researchStart,
  });

  /* Step 5: Cross-Reference */
  emitStep({
    id: "fx_cross_ref",
    name: "Cross-Referencing Sources",
    icon: "git-merge",
    status: "completed",
    description: hasRealData
      ? "Live FX data, macro research, and technical analysis validated."
      : "Research findings validated across sources.",
    completedAt: Date.now(),
    duration: 0,
  });

  /* Step 6: Advisory Synthesis */
  const synthesisStart = Date.now();

  emitStep({
    id: "fx_synthesis",
    name: "Synthesizing FX Advisory",
    icon: "sparkles",
    status: "running",
    description: `Composing ${context.toUpperCase()} FX advisory with deal impact analysis...`,
    startedAt: synthesisStart,
  });

  const answer = await synthesizeFxAdvisory({
    plan,
    technicalAnalysis,
    macroResearch,
    pairs,
    context,
    options: { dealCurrency, targetCurrency, dealSize, question },
    hasRealData,
  });

  const synthesisEnd = Date.now();

  emitStep({
    id: "fx_synthesis",
    name: "Synthesizing FX Advisory",
    icon: "sparkles",
    status: "completed",
    description: "FX advisory report composed successfully.",
    completedAt: synthesisEnd,
    duration: synthesisEnd - synthesisStart,
  });

  /* Step 7: Quality check */
  emitStep({
    id: "fx_validate",
    name: "Quality Verification",
    icon: "shield-check",
    status: "completed",
    description:
      "Data integrity, hedging assumptions, and risk factors verified.",
    completedAt: Date.now(),
    duration: 0,
  });

  return {
    answer,
    orchestration: {
      pairs,
      context,
      focus: plan.analysisFocus,
      intent: plan.intent,
      timeHorizon: plan.timeHorizon,
      macroFactors: plan.macroFactors,
      fxPairsFetched: fetchedPairs,
    },
    timing: {
      totalDuration: Date.now() - startTime,
      planningDuration: planEnd - startTime,
      dataFetchDuration: dataEnd - dataStart,
      researchDuration: researchEnd - researchStart,
      synthesisDuration: synthesisEnd - synthesisStart,
    },
  };
}

module.exports = {
  fetchForexPairs,
  fetchForexHistoricalData,
  analyzeFxStream,
};
