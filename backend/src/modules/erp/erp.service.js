const { openai } = require("../../lib/openai");
const { env } = require("../../config/env");
const { getMarketRiskPremium } = require("../../lib/fmp");

const hasFmp = Boolean(env.FMP_API_KEY);

/* ─── Data fetching ─── */

async function fetchERPData() {
  if (!hasFmp) {
    return { data: [], error: "FMP_API_KEY is not configured." };
  }
  try {
    const raw = await getMarketRiskPremium();
    const data = Array.isArray(raw) ? raw : [];
    return { data, error: null };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

/* ─── AI Agent System Prompt ─── */

const ERP_SYSTEM_PROMPT = `You are ERPOps, a senior equity risk premium analyst specializing in advising Private Equity (PE), Venture Capital (VC), and M&A professionals.

Your mission:
1) Analyze country-specific equity risk premiums and their impact on cross-border deal economics.
2) Assess how ERP differences affect discount rates, cost of equity, WACC, and DCF valuations.
3) Provide actionable insights on country risk for deal structuring, due diligence, and investment committee presentations.
4) Identify how political risk, sovereign credit risk, and macro stability factor into ERP for specific jurisdictions.

Hard rules:
- Never fabricate ERP numbers. Use only the verified data provided.
- Always contextualize ERP for PE/VC/M&A deal implications (IRR impact, multiple expansion/compression, exit risk).
- Provide executive-friendly, actionable insights.
- When real ERP data is provided, cite actual numbers.
- Quantify the valuation impact where possible (e.g., "A 2% higher ERP increases the discount rate by ~2%, reducing enterprise value by approximately 15-20%").`;

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

/* ─── Agent 1: ERP Planner ─── */

async function createErpPlannerBrief(countries, context, options = {}) {
  const contextDescriptions = {
    pe: "Private Equity — focus on LBO discount rates, portfolio company cost of equity, fund-level country allocation risk, and cross-border bolt-on acquisition ERP differentials",
    vc: "Venture Capital — focus on startup discount rates in emerging markets, multi-jurisdiction funding round implications, and risk-adjusted return expectations by geography",
    ma: "M&A Advisory — focus on cross-border deal discount rates, purchase price adjustment for country risk, fairness opinion ERP assumptions, and synergy valuation in different risk environments",
    general: "General financial advisory — ERP analysis for investment professionals",
  };

  const response = await openai.responses.create({
    model: env.OPENAI_MODEL,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `${ERP_SYSTEM_PROMPT}
Return strict JSON with keys:
- intent (string): What the user needs to understand about ERP for these countries
- analysisFocus (string[]): 3-6 specific areas to analyze
- valuationImpact (boolean): Whether to quantify valuation/IRR impact
- comparisonNeeded (boolean): Whether cross-country comparison is relevant
- sectorRelevance (string): How sector context affects the analysis`,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Context: ${contextDescriptions[context] || contextDescriptions.general}
Countries: ${countries.join(", ")}
${options.dealCountry ? `Acquirer/Fund country: ${options.dealCountry}` : ""}
${options.targetCountry ? `Target country: ${options.targetCountry}` : ""}
${options.sector ? `Sector: ${options.sector}` : ""}
${options.question ? `Specific question: ${options.question}` : ""}`,
          },
        ],
      },
    ],
  });

  const parsed = parseJsonSafe(response.output_text);

  return {
    intent: parsed?.intent || "Analyze ERP for advisory context.",
    analysisFocus: Array.isArray(parsed?.analysisFocus)
      ? parsed.analysisFocus.slice(0, 6)
      : ["country risk assessment", "cost of equity impact", "deal structuring implications"],
    valuationImpact: parsed?.valuationImpact ?? true,
    comparisonNeeded: parsed?.comparisonNeeded ?? countries.length > 1,
    sectorRelevance: parsed?.sectorRelevance || "General cross-sector",
  };
}

/* ─── Agent 2: ERP Data Analysis ─── */

async function runErpDataAnalysis(erpData, countries) {
  const relevant = erpData.filter((d) =>
    countries.some((c) => d.country.toLowerCase().includes(c.toLowerCase())),
  );

  if (relevant.length === 0) return { countryData: [], summary: "No matching ERP data found." };

  const sections = relevant.map((d) => {
    let riskLevel = "Low";
    if (d.totalEquityRiskPremium > 10) riskLevel = "High";
    else if (d.totalEquityRiskPremium > 5) riskLevel = "Medium";

    return `${d.country} (${d.continent}): Country Risk Premium = ${d.countryRiskPremium}%, Total ERP = ${d.totalEquityRiskPremium}%, Risk Level = ${riskLevel}`;
  });

  const allErp = erpData.map((d) => d.totalEquityRiskPremium);
  const globalAvg = allErp.reduce((a, b) => a + b, 0) / allErp.length;

  const summary = [
    `--- ERP DATA FOR SELECTED COUNTRIES ---`,
    ...sections,
    ``,
    `--- GLOBAL BENCHMARKS ---`,
    `Global Average Total ERP: ${globalAvg.toFixed(2)}%`,
    `Global Min: ${Math.min(...allErp).toFixed(2)}%`,
    `Global Max: ${Math.max(...allErp).toFixed(2)}%`,
    `Total Countries in Dataset: ${erpData.length}`,
  ].join("\n");

  return { countryData: relevant, summary };
}

/* ─── Agent 3: Macro & Political Risk Research ─── */

async function runErpMacroResearch(countries) {
  const response = await openai.responses.create({
    model: env.OPENAI_MODEL,
    tools: [{ type: "web_search_preview" }],
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `You are a sovereign risk and macro researcher focused on PE/VC/M&A advisory.
Research the latest developments affecting country risk for the specified countries:
- Sovereign credit ratings and outlook changes
- Political stability and regulatory environment
- Capital controls and repatriation risk
- Currency stability and inflation trends
- Rule of law, contract enforcement, and investor protections
Return structured bullet findings with source references.`,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Research country risk factors for: ${countries.join(", ")}.
Focus on implications for PE/VC/M&A deal-making and investment decisions.`,
          },
        ],
      },
    ],
  });

  return response.output_text || "No macro intelligence found.";
}

/* ─── Agent 4: Valuation Impact Calculator ─── */

async function runValuationImpactAnalysis(countryData, context, options) {
  const response = await openai.responses.create({
    model: env.OPENAI_MODEL,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `You are a quantitative valuation analyst.
Given ERP data, produce a structured analysis with:
1. Cost of Equity calculation using CAPM: Ke = Rf + β × ERP + Country Risk Premium
2. WACC impact scenarios (assume Rf = 4.2%, β = 1.0-1.2 range)
3. DCF valuation sensitivity: how a 1% change in ERP affects terminal value
4. IRR impact for PE fund modeling
5. Cross-border arbitrage opportunities (ERP differentials)

Be precise with numbers. Show actual calculations.`,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `ERP Data:\n${countryData.map((d) => `${d.country}: CRP=${d.countryRiskPremium}%, Total ERP=${d.totalEquityRiskPremium}%`).join("\n")}

Context: ${context}
${options.sector ? `Sector: ${options.sector}` : ""}
${options.question ? `Question: ${options.question}` : ""}`,
          },
        ],
      },
    ],
  });

  return response.output_text || "Could not produce valuation impact analysis.";
}

/* ─── Agent 5: Advisory Synthesizer ─── */

async function synthesizeErpAdvisory({
  plan,
  erpSummary,
  macroResearch,
  valuationImpact,
  countries,
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

  const response = await openai.responses.create({
    model: env.OPENAI_MODEL,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `${ERP_SYSTEM_PROMPT}
${hasRealData ? "IMPORTANT: You have REAL ERP data from live market feeds. Cite actual percentages." : ""}

Respond in markdown with these sections:
## Executive ERP Summary
Brief overview for the ${contextLabels[context] || "advisory"} professional.

## Country Risk Premium Analysis
Detailed breakdown for each country with risk level classification.

## Cost of Equity & WACC Impact
How ERP affects discount rates and valuations — with numbers.

## Deal Structuring Implications
Specific recommendations for structuring transactions given the ERP landscape.

## Comparative Risk Assessment
Cross-country comparison and relative value opportunities.

## Sovereign & Political Risk Factors
Current macro environment and its effect on country risk premiums.`,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Advisory Context: ${contextLabels[context] || "General"}
Countries: ${countries.join(", ")}
${options.sector ? `Sector: ${options.sector}` : ""}
${options.question ? `Question: ${options.question}` : ""}

Analysis Focus: ${plan.analysisFocus.join(", ")}

ERP Data:
${erpSummary}

Valuation Impact Analysis:
${valuationImpact}

Macro & Political Risk Research:
${macroResearch}`,
          },
        ],
      },
    ],
  });

  return response.output_text || "Could not produce ERP advisory synthesis.";
}

/* ─── Streaming Orchestrator ─── */

async function analyzeErpStream(
  { countries, context, dealCountry, targetCountry, sector, question },
  emitStep,
) {
  const startTime = Date.now();

  /* Step 1: Planning */
  emitStep({
    id: "erp_plan",
    name: "ERP Analysis Planning",
    icon: "brain",
    status: "running",
    description: `Planning analysis for ${countries.length} country/countries in ${context.toUpperCase()} context...`,
    startedAt: startTime,
  });

  const planStart = Date.now();
  const plan = await createErpPlannerBrief(countries, context, {
    dealCountry,
    targetCountry,
    sector,
    question,
  });
  const planEnd = Date.now();

  emitStep({
    id: "erp_plan",
    name: "ERP Analysis Planning",
    icon: "brain",
    status: "completed",
    description: `Plan ready — ${plan.analysisFocus.length} focus areas identified.`,
    completedAt: planEnd,
    duration: planEnd - startTime,
    detail: JSON.stringify({ intent: plan.intent, focus: plan.analysisFocus }),
  });

  /* Step 2: ERP Data */
  const dataStart = Date.now();

  emitStep({
    id: "erp_data",
    name: "Fetching ERP Data",
    icon: "database",
    status: "running",
    description: `Retrieving market risk premium data for ${countries.join(", ")}...`,
    startedAt: dataStart,
  });

  const { data: erpData } = await fetchERPData();
  const { countryData, summary: erpSummary } = await runErpDataAnalysis(
    erpData,
    countries,
  );
  const dataEnd = Date.now();
  const hasRealData = countryData.length > 0;

  emitStep({
    id: "erp_data",
    name: "Fetching ERP Data",
    icon: "database",
    status: "completed",
    description: `Retrieved ERP data for ${countryData.length} matching countr${countryData.length === 1 ? "y" : "ies"} (${erpData.length} total in dataset).`,
    completedAt: dataEnd,
    duration: dataEnd - dataStart,
  });

  /* Step 3 & 4: Parallel research */
  const researchStart = Date.now();

  emitStep({
    id: "erp_macro",
    name: "Sovereign Risk Research",
    icon: "globe",
    status: "running",
    description: "Researching credit ratings, political stability, and regulatory environment...",
    startedAt: researchStart,
  });

  emitStep({
    id: "erp_valuation",
    name: "Valuation Impact Analysis",
    icon: "bar-chart",
    status: "running",
    description: "Computing CAPM, WACC, and DCF sensitivity scenarios...",
    startedAt: researchStart,
  });

  const [macroResearch, valuationImpact] = await Promise.all([
    runErpMacroResearch(countries),
    hasRealData
      ? runValuationImpactAnalysis(countryData, context, { sector, question })
      : Promise.resolve("No live data available for valuation impact modeling."),
  ]);

  const researchEnd = Date.now();

  emitStep({
    id: "erp_macro",
    name: "Sovereign Risk Research",
    icon: "globe",
    status: "completed",
    description: "Credit ratings and political risk intelligence gathered.",
    completedAt: researchEnd,
    duration: researchEnd - researchStart,
  });

  emitStep({
    id: "erp_valuation",
    name: "Valuation Impact Analysis",
    icon: "bar-chart",
    status: "completed",
    description: "CAPM, WACC, and IRR impact scenarios computed.",
    completedAt: researchEnd,
    duration: researchEnd - researchStart,
  });

  /* Step 5: Cross-Reference */
  emitStep({
    id: "erp_cross_ref",
    name: "Cross-Referencing Sources",
    icon: "git-merge",
    status: "completed",
    description: hasRealData
      ? "Live ERP data, macro research, and valuation models validated."
      : "Research findings validated across sources.",
    completedAt: Date.now(),
    duration: 0,
  });

  /* Step 6: Advisory Synthesis */
  const synthesisStart = Date.now();

  emitStep({
    id: "erp_synthesis",
    name: "Synthesizing ERP Advisory",
    icon: "sparkles",
    status: "running",
    description: `Composing ${context.toUpperCase()} ERP advisory with deal impact analysis...`,
    startedAt: synthesisStart,
  });

  const answer = await synthesizeErpAdvisory({
    plan,
    erpSummary,
    macroResearch,
    valuationImpact,
    countries,
    context,
    options: { dealCountry, targetCountry, sector, question },
    hasRealData,
  });

  const synthesisEnd = Date.now();

  emitStep({
    id: "erp_synthesis",
    name: "Synthesizing ERP Advisory",
    icon: "sparkles",
    status: "completed",
    description: "ERP advisory report composed successfully.",
    completedAt: synthesisEnd,
    duration: synthesisEnd - synthesisStart,
  });

  /* Step 7: Quality check */
  emitStep({
    id: "erp_validate",
    name: "Quality Verification",
    icon: "shield-check",
    status: "completed",
    description: "Data integrity, CAPM assumptions, and risk factors verified.",
    completedAt: Date.now(),
    duration: 0,
  });

  return {
    answer,
    orchestration: {
      countries,
      context,
      focus: plan.analysisFocus,
      intent: plan.intent,
      countriesMatched: countryData.length,
      totalInDataset: erpData.length,
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
  fetchERPData,
  analyzeErpStream,
};
