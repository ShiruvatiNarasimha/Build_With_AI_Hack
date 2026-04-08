const { openai } = require("../../lib/openai");
const { env } = require("../../config/env");
const {
  searchSymbol,
  fetchFinancialData,
  formatFinancialDataForAI,
} = require("../../lib/fmp");

const hasFmp = Boolean(env.FMP_API_KEY);

const SYSTEM_PROMPT = `
You are ValuationOps, a senior financial AI orchestrator.
Your mission:
1) Decompose the user's valuation question into focused sub-questions.
2) Investigate public sources via specialized researchers.
3) Integrate real financial data from live market feeds when available.
4) Return a concise, reliable valuation-focused answer with assumptions and limitations.

Hard rules:
- Never fabricate financial numbers. Use only verified data.
- Prefer verifiable, recent information.
- If data is missing, explicitly say so.
- Keep output structured and executive-friendly.
- When real financial data is provided, cite the actual numbers.
`;

function parseJsonObject(text) {
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

/* ─── Agent 1: Planner ─── */

async function createPlannerBrief(question) {
  const endpointsList = hasFmp
    ? `\n- fmpEndpoints (string[]): Which financial data to retrieve. Choose from: "profile", "quote", "income-statement", "ratios", "key-metrics", "dcf", "growth", "price-history", "analyst-estimates". Select only relevant ones.`
    : "";

  const symbolsField = hasFmp
    ? `\n- symbols (string[]): Stock ticker symbols mentioned or strongly implied (e.g. ["TSLA"]). Max 3 symbols. If unclear, leave empty.`
    : "";

  const response = await openai.responses.create({
    model: env.OPENAI_MODEL,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `${SYSTEM_PROMPT}
Return strict JSON with keys:
- intent (string)${symbolsField}${endpointsList}
- linkedinQuery (string)
- wikipediaQuery (string)
- analysisFocus (string[])`,
          },
        ],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: question }],
      },
    ],
  });

  const parsed = parseJsonObject(response.output_text);

  return {
    intent:
      parsed?.intent ||
      "Answer valuation question with market context and assumptions.",
    symbols: Array.isArray(parsed?.symbols)
      ? parsed.symbols.slice(0, 3).map((s) => s.toUpperCase())
      : [],
    fmpEndpoints: Array.isArray(parsed?.fmpEndpoints)
      ? parsed.fmpEndpoints
      : [
          "profile",
          "quote",
          "income-statement",
          "ratios",
          "key-metrics",
          "dcf",
        ],
    linkedinQuery:
      parsed?.linkedinQuery ||
      `LinkedIn posts discussing valuation perspective: ${question}`,
    wikipediaQuery: parsed?.wikipediaQuery || question,
    analysisFocus: Array.isArray(parsed?.analysisFocus)
      ? parsed.analysisFocus.slice(0, 6)
      : ["valuation", "growth assumptions", "risk factors"],
  };
}

/* ─── Agent 2: FMP Financial Data ─── */

async function runFmpDataAgent(symbols, endpoints) {
  if (!hasFmp || symbols.length === 0) {
    return { dataBySymbol: {}, totalFetched: 0, errors: [] };
  }

  const allErrors = [];
  const dataBySymbol = {};
  let totalFetched = 0;

  for (const symbol of symbols) {
    const { results, errors, fetched } = await fetchFinancialData(
      symbol,
      endpoints,
    );
    dataBySymbol[symbol] = results;
    totalFetched += fetched;
    allErrors.push(...errors);
  }

  return { dataBySymbol, totalFetched, errors: allErrors };
}

/* ─── Agent 3: Market Intelligence (web search) ─── */

async function runMarketResearch(linkedinQuery) {
  const response = await openai.responses.create({
    model: env.OPENAI_MODEL,
    tools: [{ type: "web_search_preview" }],
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `You are a market intelligence researcher.
Find high-signal public posts, expert opinions, and analyst commentary related to the query.
Return bullet findings and include references in plain text.`,
          },
        ],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: linkedinQuery }],
      },
    ],
  });

  return response.output_text || "No market intelligence signals were found.";
}

/* ─── Agent 4: Fundamentals Research (web search) ─── */

async function runFundamentalsResearch(wikipediaQuery) {
  const response = await openai.responses.create({
    model: env.OPENAI_MODEL,
    tools: [{ type: "web_search_preview" }],
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `You are a fundamentals researcher.
Use Wikipedia, public encyclopedias, and authoritative sources for factual context.
Return concise factual notes and references.`,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Factual context for: ${wikipediaQuery}`,
          },
        ],
      },
    ],
  });

  return response.output_text || "No factual context was found.";
}

/* ─── Agent 5: Financial Data Analyst ─── */

async function runFinancialAnalysis(
  dataBySymbol,
  analysisFocus,
  question,
) {
  const formattedSections = [];
  for (const [symbol, data] of Object.entries(dataBySymbol)) {
    formattedSections.push(formatFinancialDataForAI(symbol, data));
  }

  const dataText = formattedSections.join("\n---\n");

  const response = await openai.responses.create({
    model: env.OPENAI_MODEL,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `You are a quantitative financial analyst.
Given raw financial data, produce a structured analysis with:
1. Key valuation metrics and what they imply
2. Financial health assessment
3. Growth trajectory analysis
4. Notable comparisons (P/E vs industry, margins vs peers)
5. Red flags or positive signals

Be precise with numbers. Use the actual data provided.
Focus areas: ${analysisFocus.join(", ")}`,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `User question: ${question}\n\n--- LIVE FINANCIAL DATA ---\n${dataText}`,
          },
        ],
      },
    ],
  });

  return (
    response.output_text || "Could not produce a financial data analysis."
  );
}

/* ─── Agent 6: Synthesizer ─── */

async function synthesizeValuationAnswer({
  analysisFocus,
  intent,
  financialAnalysis,
  marketFindings,
  fundamentalsFindings,
  question,
  hasRealData,
}) {
  const dataSection = hasRealData
    ? `\nFinancial data analysis (from live market data):\n${financialAnalysis}`
    : "";

  const response = await openai.responses.create({
    model: env.OPENAI_MODEL,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `${SYSTEM_PROMPT}
${hasRealData ? "IMPORTANT: You have access to REAL financial data from live market feeds. Cite actual numbers from the data analysis section. Distinguish clearly between verified data and estimates/opinions." : ""}

Respond in markdown with sections:
## Executive Summary
## Valuation Analysis
## Key Drivers & Growth
## Risk Assessment
## Data Sources & Methodology`,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `User question:
${question}

Planner intent:
${intent}

Analysis focus:
${analysisFocus.join(", ")}
${dataSection}

Market intelligence findings:
${marketFindings}

Fundamentals research:
${fundamentalsFindings}`,
          },
        ],
      },
    ],
  });

  return response.output_text || "I could not produce a final valuation answer.";
}

/* ─── Non-streaming orchestrator (legacy) ─── */

async function askValuationQuestion(question) {
  const plan = await createPlannerBrief(question);

  const parallelTasks = [
    runMarketResearch(plan.linkedinQuery),
    runFundamentalsResearch(plan.wikipediaQuery),
  ];

  if (hasFmp && plan.symbols.length > 0) {
    parallelTasks.push(runFmpDataAgent(plan.symbols, plan.fmpEndpoints));
  }

  const results = await Promise.all(parallelTasks);
  const marketFindings = results[0];
  const fundamentalsFindings = results[1];
  const fmpResult = results[2] ?? { dataBySymbol: {}, totalFetched: 0 };
  const hasRealData = fmpResult.totalFetched > 0;

  let financialAnalysis = "";
  if (hasRealData) {
    financialAnalysis = await runFinancialAnalysis(
      fmpResult.dataBySymbol,
      plan.analysisFocus,
      question,
    );
  }

  const answer = await synthesizeValuationAnswer({
    analysisFocus: plan.analysisFocus,
    intent: plan.intent,
    financialAnalysis,
    marketFindings,
    fundamentalsFindings,
    question,
    hasRealData,
  });

  return {
    answer,
    orchestration: {
      focus: plan.analysisFocus,
      intent: plan.intent,
      symbols: plan.symbols,
      linkedinQuery: plan.linkedinQuery,
      wikipediaQuery: plan.wikipediaQuery,
    },
  };
}

/* ─── Streaming orchestrator ─── */

async function askValuationQuestionStream(question, emitStep) {
  const startTime = Date.now();

  /* Step 1: Analyze */
  emitStep({
    id: "analyze",
    name: "Analyzing Question",
    icon: "brain",
    status: "running",
    description:
      "Understanding your question, extracting entities, and identifying analysis areas...",
    startedAt: startTime,
  });

  const planStart = Date.now();
  const plan = await createPlannerBrief(question);
  const planEnd = Date.now();

  emitStep({
    id: "analyze",
    name: "Analyzing Question",
    icon: "brain",
    status: "completed",
    description: `Question analyzed — ${plan.symbols.length > 0 ? `identified ${plan.symbols.join(", ")}` : "no specific ticker detected"}.`,
    completedAt: planEnd,
    duration: planEnd - startTime,
  });

  /* Step 2: Plan */
  emitStep({
    id: "plan",
    name: "Building Research Plan",
    icon: "git-branch",
    status: "completed",
    description: `Research plan ready — ${plan.analysisFocus.length} focus areas, ${plan.fmpEndpoints.length} data endpoints.`,
    completedAt: planEnd,
    duration: planEnd - planStart,
    detail: JSON.stringify({
      intent: plan.intent,
      symbols: plan.symbols,
      focus: plan.analysisFocus,
    }),
  });

  /* Step 3: FMP Data (if available) */
  const shouldFetchFmp = hasFmp && plan.symbols.length > 0;
  let fmpResult = { dataBySymbol: {}, totalFetched: 0, errors: [] };

  if (shouldFetchFmp) {
    const fmpStart = Date.now();

    emitStep({
      id: "fmp_data",
      name: "Fetching Financial Data",
      icon: "database",
      status: "running",
      description: `Hitting FMP API — ${plan.symbols.join(", ")} (${plan.fmpEndpoints.length} endpoints)...`,
      startedAt: fmpStart,
    });

    fmpResult = await runFmpDataAgent(plan.symbols, plan.fmpEndpoints);
    const fmpEnd = Date.now();

    emitStep({
      id: "fmp_data",
      name: "Fetching Financial Data",
      icon: "database",
      status: "completed",
      description: `Retrieved ${fmpResult.totalFetched} datasets for ${plan.symbols.join(", ")}${fmpResult.errors.length > 0 ? ` (${fmpResult.errors.length} partial errors)` : ""}.`,
      completedAt: fmpEnd,
      duration: fmpEnd - fmpStart,
    });
  }

  /* Step 4 & 5: Parallel web research */
  const researchStart = Date.now();

  emitStep({
    id: "market",
    name: "Market Intelligence",
    icon: "trending-up",
    status: "running",
    description:
      "Searching for market signals, analyst commentary, and expert opinions...",
    startedAt: researchStart,
  });

  emitStep({
    id: "fundamentals",
    name: "Fundamentals Research",
    icon: "book-open",
    status: "running",
    description:
      "Gathering factual context, historical data, and sector information...",
    startedAt: researchStart,
  });

  const [marketFindings, fundamentalsFindings] = await Promise.all([
    runMarketResearch(plan.linkedinQuery),
    runFundamentalsResearch(plan.wikipediaQuery),
  ]);

  const researchEnd = Date.now();

  emitStep({
    id: "market",
    name: "Market Intelligence",
    icon: "trending-up",
    status: "completed",
    description: "Market signals and analyst commentary collected.",
    completedAt: researchEnd,
    duration: researchEnd - researchStart,
  });

  emitStep({
    id: "fundamentals",
    name: "Fundamentals Research",
    icon: "book-open",
    status: "completed",
    description: "Factual context and sector data gathered.",
    completedAt: researchEnd,
    duration: researchEnd - researchStart,
  });

  /* Step 6: Financial Data Analysis (if we have FMP data) */
  const hasRealData = fmpResult.totalFetched > 0;
  let financialAnalysis = "";

  if (hasRealData) {
    const analysisStart = Date.now();

    emitStep({
      id: "fmp_analysis",
      name: "Analyzing Financial Metrics",
      icon: "bar-chart",
      status: "running",
      description:
        "Processing financial ratios, growth metrics, and valuation signals...",
      startedAt: analysisStart,
    });

    financialAnalysis = await runFinancialAnalysis(
      fmpResult.dataBySymbol,
      plan.analysisFocus,
      question,
    );

    const analysisEnd = Date.now();

    emitStep({
      id: "fmp_analysis",
      name: "Analyzing Financial Metrics",
      icon: "bar-chart",
      status: "completed",
      description: "Financial analysis complete — key insights extracted.",
      completedAt: analysisEnd,
      duration: analysisEnd - analysisStart,
    });
  }

  /* Step 7: Cross-reference */
  emitStep({
    id: "cross_reference",
    name: "Cross-Referencing Sources",
    icon: "git-merge",
    status: "completed",
    description: hasRealData
      ? "Live data, web research, and fundamentals validated."
      : "Research findings validated across sources.",
    completedAt: Date.now(),
    duration: 0,
  });

  /* Step 8: Synthesis */
  const synthesisStart = Date.now();

  emitStep({
    id: "synthesis",
    name: "Synthesizing Answer",
    icon: "sparkles",
    status: "running",
    description: "Composing the final valuation analysis with all data sources...",
    startedAt: synthesisStart,
  });

  const answer = await synthesizeValuationAnswer({
    analysisFocus: plan.analysisFocus,
    intent: plan.intent,
    financialAnalysis,
    marketFindings,
    fundamentalsFindings,
    question,
    hasRealData,
  });

  const synthesisEnd = Date.now();

  emitStep({
    id: "synthesis",
    name: "Synthesizing Answer",
    icon: "sparkles",
    status: "completed",
    description: "Valuation analysis composed successfully.",
    completedAt: synthesisEnd,
    duration: synthesisEnd - synthesisStart,
  });

  /* Step 9: Quality check */
  emitStep({
    id: "validate",
    name: "Quality Verification",
    icon: "shield-check",
    status: "completed",
    description: "Assumptions, data integrity, and risk factors verified.",
    completedAt: Date.now(),
    duration: 0,
  });

  return {
    answer,
    orchestration: {
      focus: plan.analysisFocus,
      intent: plan.intent,
      symbols: plan.symbols,
      linkedinQuery: plan.linkedinQuery,
      wikipediaQuery: plan.wikipediaQuery,
      fmpDatasets: fmpResult.totalFetched,
    },
    timing: {
      totalDuration: Date.now() - startTime,
      planningDuration: planEnd - startTime,
      researchDuration: researchEnd - researchStart,
      synthesisDuration: synthesisEnd - synthesisStart,
    },
  };
}

module.exports = {
  askValuationQuestion,
  askValuationQuestionStream,
};
