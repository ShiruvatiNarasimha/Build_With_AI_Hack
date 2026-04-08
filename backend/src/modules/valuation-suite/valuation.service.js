const { prisma } = require("../../lib/prisma");
const { openai } = require("../../lib/openai");
const { env } = require("../../config/env");
const {
  searchSymbol,
  fetchFinancialData,
  formatFinancialDataForAI,
} = require("../../lib/fmp");

const STEP_FIELDS = {
  1: "companyProfile",
  2: "peers",
  3: "financials",
  4: "capTable",
  5: "methods",
  6: "calculations",
  7: "results",
};

/* ──────────────────────────── CRUD ──────────────────────────── */

async function createValuation(userId, name) {
  return prisma.valuation.create({
    data: {
      userId,
      name: name || "Untitled Valuation",
      status: "DRAFT",
    },
  });
}

async function listValuations(userId) {
  return prisma.valuation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      currentStep: true,
      completedSteps: true,
      companyProfile: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

async function getValuation(id, userId) {
  return prisma.valuation.findFirst({
    where: { id, userId },
  });
}

async function updateStep(id, userId, step, data, markComplete) {
  const field = STEP_FIELDS[step];
  if (!field) throw new Error(`Invalid step: ${step}`);

  const existing = await prisma.valuation.findFirst({
    where: { id, userId },
  });
  if (!existing) return null;

  const updateData = { [field]: data };

  if (markComplete) {
    const completed = new Set(existing.completedSteps);
    completed.add(step);
    updateData.completedSteps = [...completed].sort((a, b) => a - b);
  }

  const nextStep = Math.max(existing.currentStep, step + 1);
  updateData.currentStep = Math.min(nextStep, 7);
  updateData.status = markComplete && step === 7 ? "COMPLETED" : "IN_PROGRESS";

  return prisma.valuation.update({
    where: { id },
    data: updateData,
  });
}

async function deleteValuation(id, userId) {
  const existing = await prisma.valuation.findFirst({
    where: { id, userId },
  });
  if (!existing) return null;

  return prisma.valuation.delete({ where: { id } });
}

/* ──────────────────── AI: Company Profile Agent ──────────────────── */

async function aiGenerateCompanyProfile(
  valuationId,
  userId,
  { companyName, website, linkedin, description },
  emitStep,
) {
  const valuation = await prisma.valuation.findFirst({
    where: { id: valuationId, userId },
  });
  if (!valuation) throw new Error("Valuation not found.");

  const hasFmp = Boolean(env.FMP_API_KEY);
  const startTime = Date.now();

  /* ── Step 1: AI Research ── */

  emitStep({
    id: "profile_research",
    name: "AI Research & Intelligence",
    icon: "search",
    status: "running",
    description: `Gathering strategic intelligence on ${companyName}...`,
    startedAt: startTime,
  });

  const researchResponse = await openai.responses.create({
    model: env.OPENAI_MODEL,
    tools: [{ type: "web_search_preview" }],
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `You are a senior PE/VC analyst conducting investment due diligence. Research the company thoroughly and return STRICT JSON with these keys:
- companyName (string)
- legalName (string, if different from trading name)
- ticker (string or null, stock ticker if publicly traded)
- website (string)
- linkedin (string)
- industry (string, GICS-aligned)
- sector (string, GICS-aligned)
- subSector (string)
- country (string)
- region (string: "North America", "Europe", "Asia-Pacific", "LATAM", "MENA", "Africa")
- foundedYear (number)
- headquarters (string, city + country)
- employees (string, e.g. "50-100" or "10,000+")
- stage (string: "Pre-Revenue", "Early-Stage", "Growth", "Mature", "Public")
- revenueRange (string, e.g. "$1M-$5M", "$100M-$500M")
- description (string, 3-4 sentences covering what the company does, market position, and differentiation)
- businessModel (string, 2 sentences on revenue model and unit economics)
- keyProducts (string[], up to 5 main products/services)
- targetMarket (string, describe TAM/SAM)
- competitors (string[], up to 6 competitor names with tickers if public)
- keywords (string[], 12 keywords: 4 core business, 4 sector focus, 4 edge/niche)
- strengths (string[], up to 5 investment thesis points)
- risks (string[], up to 5 key risk factors for investors)
- recentNews (string[], up to 4 recent material developments)
- managementTeam (object[], up to 4 entries: { name, title, background })
- fundingHistory (string[], up to 5 key funding rounds or financial events, e.g. "Series B: $50M led by Sequoia (2023)")
- moat (string, 1-2 sentences on competitive advantage / defensibility)
- exitComparables (string[], up to 3 comparable exits/IPOs in the space)`,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Company: ${companyName}${website ? `\nWebsite: ${website}` : ""}${linkedin ? `\nLinkedIn: ${linkedin}` : ""}${description ? `\nContext: ${description}` : ""}`,
          },
        ],
      },
    ],
  });

  const researchEnd = Date.now();
  emitStep({
    id: "profile_research",
    name: "AI Research & Intelligence",
    icon: "search",
    status: "completed",
    description: `Strategic intelligence gathered for ${companyName}.`,
    completedAt: researchEnd,
    duration: researchEnd - startTime,
  });

  /* ── Step 2: Parse AI response ── */

  let profile;
  try {
    const text = researchResponse.output_text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    profile = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    profile = null;
  }

  if (!profile) {
    profile = {
      companyName,
      website: website || "",
      linkedin: linkedin || "",
      description: description || "",
      industry: "Unknown",
      sector: "Unknown",
      country: "Unknown",
      keywords: [],
    };
  }

  profile.companyName = profile.companyName || companyName;
  profile.website = profile.website || website || "";
  profile.linkedin = profile.linkedin || linkedin || "";

  /* ── Step 3: Resolve ticker & pull FMP data ── */

  let resolvedSymbol = profile.ticker || null;
  let fmpData = null;

  if (hasFmp) {
    const fmpStart = Date.now();
    emitStep({
      id: "profile_fmp_resolve",
      name: "Resolving Market Data",
      icon: "bar-chart",
      status: "running",
      description: "Looking up ticker and pulling live market data...",
      startedAt: fmpStart,
    });

    if (!resolvedSymbol) {
      try {
        const searchResults = await searchSymbol(companyName);
        if (searchResults.length > 0) {
          resolvedSymbol = searchResults[0].symbol;
        }
      } catch {
        // Ticker search is best-effort
      }
    }

    if (resolvedSymbol) {
      try {
        const { results, fetched } = await fetchFinancialData(resolvedSymbol, [
          "profile",
          "quote",
          "ratios",
          "key-metrics",
          "dcf",
          "growth",
          "analyst-estimates",
          "income-statement",
        ]);

        if (fetched > 0) {
          fmpData = results;

          const p = results.profile;
          if (p) {
            profile.ticker = resolvedSymbol;
            profile.exchange = p.exchangeShortName || null;
            profile.ipoDate = p.ipoDate || null;
            profile.ceo = p.ceo || null;
            profile.employees = p.fullTimeEmployees
              ? Number(p.fullTimeEmployees).toLocaleString()
              : profile.employees;
            profile.industry = p.industry || profile.industry;
            profile.sector = p.sector || profile.sector;
            profile.country = p.country || profile.country;
            profile.website = p.website || profile.website;
            if (p.description && p.description.length > (profile.description?.length || 0)) {
              profile.fmpDescription = p.description;
            }
            profile.stage = "Public";
          }

          // Market snapshot
          const q = results.quote;
          if (q) {
            profile.marketData = {
              price: q.price,
              change: q.change,
              changePercent: q.changesPercentage,
              marketCap: q.marketCap,
              volume: q.volume,
              avgVolume: q.avgVolume,
              dayLow: q.dayLow,
              dayHigh: q.dayHigh,
              yearLow: q.yearLow,
              yearHigh: q.yearHigh,
              pe: q.pe,
              eps: q.eps,
              sharesOutstanding: q.sharesOutstanding,
            };
          }

          // Valuation multiples & profitability
          const r = results.ratios?.[0];
          if (r) {
            profile.valuationMultiples = {
              peRatio: r.priceEarningsRatio,
              pbRatio: r.priceToBookRatio,
              psRatio: r.priceToSalesRatio,
              evEbitda: r.enterpriseValueMultiple,
              pegRatio: r.priceEarningsToGrowthRatio,
              priceToFcf: r.priceToFreeCashFlowsRatio,
              evRevenue: r.enterpriseValueMultiple
                ? (r.priceToSalesRatio
                    ? r.enterpriseValueMultiple / (r.priceEarningsRatio / r.priceToSalesRatio || 1)
                    : null)
                : null,
            };

            profile.profitability = {
              grossMargin: r.grossProfitMargin,
              operatingMargin: r.operatingProfitMargin,
              netMargin: r.netProfitMargin,
              roe: r.returnOnEquity,
              roa: r.returnOnAssets,
              roic: r.returnOnCapitalEmployed,
            };

            profile.capitalStructure = {
              debtToEquity: r.debtEquityRatio,
              currentRatio: r.currentRatio,
              quickRatio: r.quickRatio,
              interestCoverage: r.interestCoverage,
              debtToAssets: r.debtRatio,
              dividendYield: r.dividendYield,
              payoutRatio: r.payoutRatio,
            };
          }

          // Enterprise value & key metrics
          const km = results["key-metrics"]?.[0];
          if (km) {
            profile.enterpriseMetrics = {
              enterpriseValue: km.enterpriseValue,
              evToEbitda: km.enterpriseValueOverEBITDA,
              evToRevenue: km.evToSales,
              evToFcf: km.evToFreeCashFlow,
              revenuePerShare: km.revenuePerShare,
              fcfPerShare: km.freeCashFlowPerShare,
              bookValuePerShare: km.bookValuePerShare,
              tangibleBookPerShare: km.tangibleBookValuePerShare,
              netDebt: km.netDebtToEBITDA
                ? (km.enterpriseValueOverEBITDA && km.enterpriseValue
                    ? km.enterpriseValue - (profile.marketData?.marketCap || 0)
                    : null)
                : null,
            };
          }

          // DCF intrinsic value
          const dcfData = results.dcf;
          if (dcfData) {
            profile.dcfAnalysis = {
              dcfFairValue: dcfData.dcf,
              stockPrice: dcfData["Stock Price"],
              upside: dcfData.dcf && dcfData["Stock Price"]
                ? ((dcfData.dcf - dcfData["Stock Price"]) / dcfData["Stock Price"]) * 100
                : null,
              date: dcfData.date,
            };
          }

          // Growth metrics
          const g = results.growth?.[0];
          if (g) {
            profile.growthMetrics = {
              revenueGrowth: g.revenueGrowth,
              netIncomeGrowth: g.netIncomeGrowth,
              epsGrowth: g.epsgrowth,
              fcfGrowth: g.freeCashFlowGrowth,
              grossProfitGrowth: g.grossProfitGrowth,
              ebitdaGrowth: g.ebitdagrowth,
              rdExpenseGrowth: g.rdexpenseGrowth,
              sgaGrowth: g.sgaexpensesGrowth,
            };
          }

          // Analyst estimates
          const est = results["analyst-estimates"]?.[0];
          if (est) {
            profile.analystEstimates = {
              date: est.date,
              estimatedRevenueAvg: est.estimatedRevenueAvg,
              estimatedRevenueLow: est.estimatedRevenueLow,
              estimatedRevenueHigh: est.estimatedRevenueHigh,
              estimatedEpsAvg: est.estimatedEpsAvg,
              estimatedEpsLow: est.estimatedEpsLow,
              estimatedEpsHigh: est.estimatedEpsHigh,
              numberOfAnalysts: est.numberAnalystsEstimatedRevenue,
              estimatedNetIncomeAvg: est.estimatedNetIncomeAvg,
              estimatedEbitdaAvg: est.estimatedEbitdaAvg,
            };
          }

          // Income statement snapshot (last 3 years)
          const stmts = results["income-statement"];
          if (stmts?.length) {
            profile.incomeSnapshot = stmts.slice(0, 4).map((s) => ({
              date: s.date,
              period: s.calendarYear || s.date?.substring(0, 4),
              revenue: s.revenue,
              grossProfit: s.grossProfit,
              operatingIncome: s.operatingIncome,
              ebitda: s.ebitda,
              netIncome: s.netIncome,
              eps: s.eps,
              grossMargin: s.grossProfitRatio,
              operatingMargin: s.operatingIncomeRatio,
              netMargin: s.netIncomeRatio,
            }));
          }
        }

        emitStep({
          id: "profile_fmp_resolve",
          name: "Resolving Market Data",
          icon: "bar-chart",
          status: "completed",
          description: `Pulled ${fetched} live datasets for ${resolvedSymbol} — market data, multiples, financials, DCF, growth & estimates.`,
          completedAt: Date.now(),
          duration: Date.now() - fmpStart,
        });
      } catch (err) {
        emitStep({
          id: "profile_fmp_resolve",
          name: "Resolving Market Data",
          icon: "bar-chart",
          status: "completed",
          description: `Ticker ${resolvedSymbol} found but some data unavailable. Proceeding with AI data.`,
          completedAt: Date.now(),
          duration: Date.now() - fmpStart,
        });
      }
    } else {
      emitStep({
        id: "profile_fmp_resolve",
        name: "Resolving Market Data",
        icon: "bar-chart",
        status: "completed",
        description: "No public ticker found — this appears to be a private company. Profile built from AI research.",
        completedAt: Date.now(),
        duration: Date.now() - fmpStart,
      });
    }
  }

  /* ── Step 4: AI Investment Thesis ── */

  const thesisStart = Date.now();
  emitStep({
    id: "profile_thesis",
    name: "Building Investment Thesis",
    icon: "sparkles",
    status: "running",
    description: "AI synthesizing investment thesis from all data sources...",
    startedAt: thesisStart,
  });

  const thesisContext = fmpData
    ? formatFinancialDataForAI(resolvedSymbol, fmpData)
    : "No live financial data available — private company.";

  const thesisResponse = await openai.responses.create({
    model: env.OPENAI_MODEL,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `You are a Managing Director at a top PE/VC firm. Given the company profile and financial data, produce a concise investment thesis.
Return STRICT JSON with:
- investmentThesis (string, 3-4 sentences: why this company is interesting for PE/VC/M&A)
- qualityScore (number 1-100, overall investment quality rating)
- qualityFactors (object: { management: number 1-10, marketPosition: number 1-10, financials: number 1-10, growth: number 1-10, moat: number 1-10 })
- keyMetricsHighlight (string[], 4-6 one-liner highlights like "EV/EBITDA 15.2x vs sector median 12.1x" or "Revenue CAGR 28% (3yr)")
- redFlags (string[], 0-3 concerns for investors)
- catalysts (string[], 2-4 potential positive catalysts)`,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Company: ${profile.companyName}
Industry: ${profile.industry} | Sector: ${profile.sector}
Stage: ${profile.stage || "Unknown"}
Description: ${profile.description}
Business Model: ${profile.businessModel || "N/A"}
Competitors: ${(profile.competitors || []).join(", ") || "N/A"}
Strengths: ${(profile.strengths || []).join("; ") || "N/A"}
Risks: ${(profile.risks || []).join("; ") || "N/A"}

${thesisContext}`,
          },
        ],
      },
    ],
  });

  try {
    const text = thesisResponse.output_text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const thesis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    if (thesis) {
      profile.investmentThesis = thesis.investmentThesis;
      profile.qualityScore = thesis.qualityScore;
      profile.qualityFactors = thesis.qualityFactors;
      profile.keyMetricsHighlight = thesis.keyMetricsHighlight;
      profile.redFlags = thesis.redFlags;
      profile.catalysts = thesis.catalysts;
    }
  } catch {
    // Thesis generation is best-effort
  }

  emitStep({
    id: "profile_thesis",
    name: "Building Investment Thesis",
    icon: "sparkles",
    status: "completed",
    description: "Investment thesis and quality scoring complete.",
    completedAt: Date.now(),
    duration: Date.now() - thesisStart,
  });

  /* ── Step 5: Save ── */

  const saveStart = Date.now();
  emitStep({
    id: "profile_save",
    name: "Saving Profile",
    icon: "database",
    status: "running",
    description: "Persisting full profile to database...",
    startedAt: saveStart,
  });

  profile.dataSource = fmpData ? "fmp+ai" : "ai";
  profile.lastUpdated = new Date().toISOString();

  const completed = new Set(valuation.completedSteps);
  completed.add(1);

  const updated = await prisma.valuation.update({
    where: { id: valuationId },
    data: {
      name: profile.companyName || companyName,
      companyProfile: profile,
      completedSteps: [...completed].sort((a, b) => a - b),
      currentStep: Math.max(valuation.currentStep, 2),
      status: "IN_PROGRESS",
    },
  });

  const saveEnd = Date.now();
  emitStep({
    id: "profile_save",
    name: "Saving Profile",
    icon: "database",
    status: "completed",
    description: "Profile saved to database.",
    completedAt: saveEnd,
    duration: saveEnd - saveStart,
  });

  return {
    profile: updated.companyProfile,
    timing: { totalDuration: saveEnd - startTime },
  };
}

/* ──────────────────── AI: Peer Finder Agent ──────────────────── */

async function aiFindPeers(
  valuationId,
  userId,
  { industry, sector, country, keywords, topN = 25 },
  emitStep,
) {
  const valuation = await prisma.valuation.findFirst({
    where: { id: valuationId, userId },
  });
  if (!valuation) throw new Error("Valuation not found.");

  const companyProfile = valuation.companyProfile || {};
  const searchIndustry = industry || companyProfile.industry || "Technology";
  const searchSector = sector || companyProfile.sector || "";
  const searchCountry = country || companyProfile.country || "";
  const searchKeywords =
    keywords || companyProfile.keywords || [companyProfile.companyName];

  const startTime = Date.now();

  emitStep({
    id: "peer_search",
    name: "Finding Comparable Companies",
    icon: "users",
    status: "running",
    description: `Searching for peers in ${searchIndustry}...`,
    startedAt: startTime,
  });

  const peerPrompt = `You are a PE/VC comparable company analyst.
Find ${topN} comparable PUBLIC companies for a ${searchIndustry} company${searchSector ? ` in ${searchSector}` : ""}${searchCountry ? ` based in ${searchCountry}` : ""}.

Company description: ${companyProfile.description || "N/A"}
Business model: ${companyProfile.businessModel || "N/A"}
Keywords: ${searchKeywords.join(", ")}

Return STRICT JSON array where each element has:
- symbol (string, stock ticker)
- companyName (string)
- industry (string)
- sector (string)
- country (string)
- marketCap (number, in USD)
- evEbitda (number or null)
- evRevenue (number or null)
- peRatio (number or null)
- revenueGrowth (number or null, as decimal e.g. 0.15 for 15%)
- similarityScore (number 0-1)
- matchReason (string, 1 sentence why this is a comparable)

Order by similarityScore descending. Only return real, verifiable public companies.`;

  const peerResponse = await openai.responses.create({
    model: env.OPENAI_MODEL,
    tools: [{ type: "web_search_preview" }],
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: peerPrompt }],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Find comparable public companies for: ${companyProfile.companyName || "the target company"}`,
          },
        ],
      },
    ],
  });

  const searchEnd = Date.now();
  emitStep({
    id: "peer_search",
    name: "Finding Comparable Companies",
    icon: "users",
    status: "completed",
    description: "Comparable companies identified.",
    completedAt: searchEnd,
    duration: searchEnd - startTime,
  });

  emitStep({
    id: "deal_search",
    name: "Finding M&A Transactions",
    icon: "git-merge",
    status: "running",
    description: `Searching for comparable M&A deals in ${searchIndustry}...`,
    startedAt: searchEnd,
  });

  const dealPrompt = `You are an M&A transaction analyst.
Find 10-15 comparable M&A transactions for a ${searchIndustry} company.
Keywords: ${searchKeywords.join(", ")}

Return STRICT JSON array where each element has:
- target (string, acquired company name)
- acquirer (string)
- dealValue (number, in USD millions)
- dealDate (string, YYYY-MM-DD)
- evRevenue (number or null, EV/Revenue multiple)
- evEbitda (number or null, EV/EBITDA multiple)
- industry (string)
- sector (string)
- description (string, 1 sentence)
- similarityScore (number 0-1)

Only include real, verifiable transactions from the past 5 years. Order by similarityScore descending.`;

  const dealResponse = await openai.responses.create({
    model: env.OPENAI_MODEL,
    tools: [{ type: "web_search_preview" }],
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: dealPrompt }],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Find comparable M&A deals for: ${companyProfile.companyName || "the target company"} in ${searchIndustry}`,
          },
        ],
      },
    ],
  });

  const dealEnd = Date.now();
  emitStep({
    id: "deal_search",
    name: "Finding M&A Transactions",
    icon: "git-merge",
    status: "completed",
    description: "M&A comparable transactions found.",
    completedAt: dealEnd,
    duration: dealEnd - searchEnd,
  });

  let peers = [];
  let deals = [];

  try {
    const peerText = peerResponse.output_text;
    const peerJson = peerText.match(/\[[\s\S]*\]/);
    peers = peerJson ? JSON.parse(peerJson[0]) : [];
  } catch {
    peers = [];
  }

  try {
    const dealText = dealResponse.output_text;
    const dealJson = dealText.match(/\[[\s\S]*\]/);
    deals = dealJson ? JSON.parse(dealJson[0]) : [];
  } catch {
    deals = [];
  }

  emitStep({
    id: "peer_enrich",
    name: "Enriching with Market Data",
    icon: "bar-chart",
    status: "running",
    description: "Fetching live financial data for top peers...",
    startedAt: dealEnd,
  });

  const hasFmp = Boolean(env.FMP_API_KEY);
  if (hasFmp && peers.length > 0) {
    const topSymbols = peers
      .slice(0, 5)
      .map((p) => p.symbol)
      .filter(Boolean);

    for (const symbol of topSymbols) {
      try {
        const { results } = await fetchFinancialData(symbol, [
          "profile",
          "quote",
          "ratios",
        ]);
        const peer = peers.find((p) => p.symbol === symbol);
        if (peer && results.profile) {
          peer.marketCap = results.profile.mktCap || peer.marketCap;
          peer.industry = results.profile.industry || peer.industry;
          peer.sector = results.profile.sector || peer.sector;
        }
        if (peer && results.quote) {
          peer.peRatio = results.quote.pe || peer.peRatio;
        }
        if (peer && results.ratios?.[0]) {
          peer.evEbitda =
            results.ratios[0].enterpriseValueMultiple || peer.evEbitda;
          peer.evRevenue =
            results.ratios[0].priceToSalesRatio || peer.evRevenue;
        }
      } catch {
        // FMP enrichment is best-effort
      }
    }
  }

  const enrichEnd = Date.now();
  emitStep({
    id: "peer_enrich",
    name: "Enriching with Market Data",
    icon: "bar-chart",
    status: "completed",
    description: `Enriched ${peers.length} peers with live data.`,
    completedAt: enrichEnd,
    duration: enrichEnd - dealEnd,
  });

  const peerData = { companies: peers, deals, updatedAt: new Date().toISOString() };

  const completed = new Set(valuation.completedSteps);
  completed.add(2);

  await prisma.valuation.update({
    where: { id: valuationId },
    data: {
      peers: peerData,
      completedSteps: [...completed].sort((a, b) => a - b),
      currentStep: Math.max(valuation.currentStep, 3),
      status: "IN_PROGRESS",
    },
  });

  return {
    peers: peerData,
    timing: { totalDuration: enrichEnd - startTime },
  };
}

/* ──────────────────── AI: Financial Data Agent ──────────────────── */

async function aiFetchFinancials(
  valuationId,
  userId,
  { symbol, forecastYears = 5 },
  emitStep,
) {
  const valuation = await prisma.valuation.findFirst({
    where: { id: valuationId, userId },
  });
  if (!valuation) throw new Error("Valuation not found.");

  const startTime = Date.now();
  const hasFmp = Boolean(env.FMP_API_KEY);
  let historicalData = null;
  let resolvedSymbol = symbol;

  if (hasFmp && !resolvedSymbol) {
    const companyProfile = valuation.companyProfile || {};
    const companyName = companyProfile.companyName || "";
    if (companyName) {
      emitStep({
        id: "fin_symbol",
        name: "Resolving Ticker",
        icon: "search",
        status: "running",
        description: `Looking up ticker for ${companyName}...`,
        startedAt: startTime,
      });

      const results = await searchSymbol(companyName);
      if (results.length > 0) resolvedSymbol = results[0].symbol;

      emitStep({
        id: "fin_symbol",
        name: "Resolving Ticker",
        icon: "search",
        status: "completed",
        description: resolvedSymbol
          ? `Found ticker: ${resolvedSymbol}`
          : "No public ticker found — will use AI projections.",
        completedAt: Date.now(),
        duration: Date.now() - startTime,
      });
    }
  }

  if (hasFmp && resolvedSymbol) {
    const fetchStart = Date.now();
    emitStep({
      id: "fin_fetch",
      name: "Pulling Financial Data",
      icon: "database",
      status: "running",
      description: `Fetching 10 years of financials for ${resolvedSymbol}...`,
      startedAt: fetchStart,
    });

    const { results, fetched } = await fetchFinancialData(resolvedSymbol, [
      "income-statement",
      "ratios",
      "key-metrics",
      "dcf",
      "growth",
      "analyst-estimates",
    ]);
    historicalData = { symbol: resolvedSymbol, ...results, fetched };

    emitStep({
      id: "fin_fetch",
      name: "Pulling Financial Data",
      icon: "database",
      status: "completed",
      description: `Retrieved ${fetched} datasets for ${resolvedSymbol}.`,
      completedAt: Date.now(),
      duration: Date.now() - fetchStart,
    });
  }

  /* ── Build historical rows directly from FMP income statements ── */

  const companyProfile = valuation.companyProfile || {};
  let fmpHistorical = {};
  let fmpHistoricalYears = [];

  if (historicalData?.["income-statement"]?.length) {
    const stmts = historicalData["income-statement"]
      .slice(0, 5)
      .reverse();

    fmpHistoricalYears = stmts.map(
      (s) => s.calendarYear || s.date?.substring(0, 4),
    );

    const metricsMap = {
      revenue: "revenue",
      cogs: "costOfRevenue",
      grossProfit: "grossProfit",
      operatingExpenses: "operatingExpenses",
      ebitda: "ebitda",
      depreciation: "depreciationAndAmortization",
      ebit: "operatingIncome",
      interestExpense: "interestExpense",
      netIncome: "netIncome",
    };

    for (const [metricKey, fmpKey] of Object.entries(metricsMap)) {
      fmpHistorical[metricKey] = {};
      for (const s of stmts) {
        const yr = s.calendarYear || s.date?.substring(0, 4);
        fmpHistorical[metricKey][yr] = s[fmpKey] ?? null;
      }
    }

    // Derived metrics from absolute numbers
    fmpHistorical.grossMargin = {};
    fmpHistorical.ebitdaMargin = {};
    fmpHistorical.netMargin = {};
    fmpHistorical.revenueGrowth = {};
    for (let i = 0; i < stmts.length; i++) {
      const s = stmts[i];
      const yr = s.calendarYear || s.date?.substring(0, 4);
      fmpHistorical.grossMargin[yr] =
        s.revenue ? s.grossProfit / s.revenue : null;
      fmpHistorical.ebitdaMargin[yr] =
        s.revenue && s.ebitda ? s.ebitda / s.revenue : null;
      fmpHistorical.netMargin[yr] =
        s.revenue ? s.netIncome / s.revenue : null;
      if (i > 0) {
        const prev = stmts[i - 1];
        fmpHistorical.revenueGrowth[yr] =
          prev.revenue ? (s.revenue - prev.revenue) / prev.revenue : null;
      }
    }

    // FCF from cash flow if available, otherwise estimate
    fmpHistorical.freeCashFlow = {};
    fmpHistorical.capex = {};
    for (const s of stmts) {
      const yr = s.calendarYear || s.date?.substring(0, 4);
      fmpHistorical.freeCashFlow[yr] = s.freeCashFlow ?? null;
      fmpHistorical.capex[yr] = s.capitalExpenditure
        ? Math.abs(s.capitalExpenditure)
        : null;
    }
  }

  const hasFmpHistory = fmpHistoricalYears.length > 0;
  const latestYear = hasFmpHistory
    ? fmpHistoricalYears[fmpHistoricalYears.length - 1]
    : new Date().getFullYear().toString();
  const latestRevenue = hasFmpHistory
    ? fmpHistorical.revenue?.[latestYear]
    : null;

  /* ── Build sample row text for AI so it knows the exact scale ── */

  let scaleHint = "";
  if (latestRevenue) {
    scaleHint = `\n\nCRITICAL SCALE REFERENCE — the company's most recent revenue is ${latestRevenue} USD (that is $${(latestRevenue / 1e9).toFixed(2)} billion or $${(latestRevenue / 1e6).toFixed(0)} million). ALL absolute-value metrics MUST be at this same order of magnitude. A projected revenue of 5000 when actual is 3100000000 is WRONG.`;
  }

  emitStep({
    id: "fin_project",
    name: "AI Financial Projections",
    icon: "trending-up",
    status: "running",
    description: `Generating ${forecastYears}-year financial projections...`,
    startedAt: Date.now(),
  });

  const dataContext = historicalData
    ? formatFinancialDataForAI(resolvedSymbol || "COMPANY", historicalData)
    : "No historical financial data available.";

  const projectionsResponse = await openai.responses.create({
    model: env.OPENAI_MODEL,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `You are a financial modeling expert for PE/VC due diligence.
Generate ${forecastYears}-year FORWARD projections starting from ${Number(latestYear) + 1}. Return STRICT JSON with:
- currency (string, e.g. "USD")
- forecastYears (string[], e.g. ["${Number(latestYear) + 1}","${Number(latestYear) + 2}","${Number(latestYear) + 3}"])
- metrics: object where each key is a metric name and value is object with ONLY forecast year keys.
  Required metrics: "revenue", "revenueGrowth", "grossProfit", "grossMargin",
  "ebitda", "ebitdaMargin", "ebit", "netIncome", "netMargin", "freeCashFlow", "capex"

CRITICAL RULES FOR NUMBERS:
- ALL absolute dollar values (revenue, grossProfit, ebitda, ebit, netIncome, freeCashFlow, capex) MUST be in FULL USD.
  Example: $3.1 billion = 3100000000 (NOT 3100, NOT 3.1, NOT 3100000)
  Example: $500 million = 500000000 (NOT 500, NOT 500000)
  Example: $45 million = 45000000
- Growth rates and margins MUST be decimals: 15% = 0.15, -7% = -0.07
- Do NOT abbreviate or scale down numbers. Use the FULL integer value in USD.
${scaleHint}

- assumptions (string[], 5-8 key assumptions used)
- risks (string[], 3-5 key risk factors)`,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Generate financial projections for: ${companyProfile.companyName || "Target Company"}
Industry: ${companyProfile.industry || "N/A"}
Stage: ${companyProfile.stage || "N/A"}
Revenue Range: ${companyProfile.revenueRange || "N/A"}

${dataContext}`,
          },
        ],
      },
    ],
  });

  let aiProjections;
  try {
    const text = projectionsResponse.output_text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    aiProjections = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    aiProjections = null;
  }

  /* ── Merge: FMP historical + AI forecast into unified projections ── */

  let projections;
  if (aiProjections) {
    const aiForecastYears = aiProjections.forecastYears || [];

    // Auto-fix: if AI returned small numbers, scale them up
    if (latestRevenue && latestRevenue > 1e6) {
      const aiMetrics = aiProjections.metrics || {};
      const firstForecastYear = aiForecastYears[0];
      const aiFirstRevenue = aiMetrics.revenue?.[firstForecastYear];
      if (aiFirstRevenue && aiFirstRevenue > 0 && aiFirstRevenue < latestRevenue / 100) {
        // AI returned numbers in wrong scale — try to detect and fix
        let scaleFactor = 1;
        if (aiFirstRevenue < 1e3 && latestRevenue > 1e9)
          scaleFactor = 1e6;
        else if (aiFirstRevenue < 1e6 && latestRevenue > 1e9)
          scaleFactor = 1e3;
        else if (aiFirstRevenue < 1e6 && latestRevenue > 1e6)
          scaleFactor = 1e3;

        if (scaleFactor > 1) {
          const absMetrics = [
            "revenue", "grossProfit", "ebitda", "ebit",
            "netIncome", "freeCashFlow", "capex",
            "operatingExpenses", "interestExpense",
            "depreciation", "cogs", "changeInWorkingCapital",
          ];
          for (const mk of absMetrics) {
            if (aiMetrics[mk]) {
              for (const yr of Object.keys(aiMetrics[mk])) {
                if (typeof aiMetrics[mk][yr] === "number") {
                  aiMetrics[mk][yr] *= scaleFactor;
                }
              }
            }
          }
        }
      }
    }

    // Merge FMP historical + AI forecast
    const mergedMetrics = {};
    const allMetricKeys = new Set([
      ...Object.keys(fmpHistorical),
      ...Object.keys(aiProjections.metrics || {}),
    ]);

    for (const key of allMetricKeys) {
      mergedMetrics[key] = {
        ...(fmpHistorical[key] || {}),
        ...(aiProjections.metrics?.[key] || {}),
      };
    }

    projections = {
      currency: aiProjections.currency || "USD",
      historicalYears: hasFmpHistory ? fmpHistoricalYears : [],
      forecastYears: aiForecastYears,
      metrics: mergedMetrics,
      assumptions: aiProjections.assumptions || [],
      risks: aiProjections.risks || [],
    };
  } else if (hasFmpHistory) {
    projections = {
      currency: "USD",
      historicalYears: fmpHistoricalYears,
      forecastYears: [],
      metrics: fmpHistorical,
      assumptions: ["Historical data from FMP. AI projection failed."],
      risks: [],
    };
  }

  const projectEnd = Date.now();
  emitStep({
    id: "fin_project",
    name: "AI Financial Projections",
    icon: "trending-up",
    status: "completed",
    description: hasFmpHistory
      ? `${fmpHistoricalYears.length} years of FMP data + ${aiProjections?.forecastYears?.length || 0} years of AI projections.`
      : "AI projections generated.",
    completedAt: projectEnd,
    duration: projectEnd - startTime,
  });

  const financialData = {
    symbol: resolvedSymbol || null,
    historical: historicalData,
    projections,
    updatedAt: new Date().toISOString(),
  };

  const completed = new Set(valuation.completedSteps);
  completed.add(3);

  await prisma.valuation.update({
    where: { id: valuationId },
    data: {
      financials: financialData,
      completedSteps: [...completed].sort((a, b) => a - b),
      currentStep: Math.max(valuation.currentStep, 4),
      status: "IN_PROGRESS",
    },
  });

  return {
    financials: financialData,
    timing: { totalDuration: projectEnd - startTime },
  };
}

/* ──────────────────── AI: Valuation Engine ──────────────────── */

function buildValuationContext(valuation) {
  const cp = valuation.companyProfile || {};
  const peers = valuation.peers || {};
  const fin = valuation.financials || {};
  const cap = valuation.capTable || {};

  const lines = [];

  // Company overview (lean — no FMP blobs)
  lines.push(`## Target Company: ${cp.companyName || "Unknown"}`);
  lines.push(`Industry: ${cp.industry || "N/A"} | Sector: ${cp.sector || "N/A"} | Country: ${cp.country || "N/A"}`);
  lines.push(`Stage: ${cp.stage || "N/A"} | Employees: ${cp.employees || "N/A"}`);
  if (cp.description) lines.push(`Description: ${cp.description}`);
  if (cp.businessModel) lines.push(`Business Model: ${cp.businessModel}`);

  // Market data from company profile (if public)
  const md = cp.marketData;
  if (md) {
    lines.push(`\n## Market Data (Live)`);
    lines.push(`Stock Price: $${md.price} | Market Cap: $${md.marketCap} | P/E: ${md.pe || "N/A"} | EPS: $${md.eps || "N/A"}`);
    lines.push(`52W Range: $${md.yearLow} – $${md.yearHigh}`);
  }
  const em = cp.enterpriseMetrics;
  if (em?.enterpriseValue) {
    lines.push(`Enterprise Value: $${em.enterpriseValue}`);
  }

  // Valuation multiples from profile
  const vm = cp.valuationMultiples;
  if (vm) {
    lines.push(`\n## Current Multiples`);
    lines.push(`EV/EBITDA: ${vm.evEbitda || "N/A"} | P/E: ${vm.peRatio || "N/A"} | P/B: ${vm.pbRatio || "N/A"} | EV/Revenue: ${vm.evRevenue || vm.psRatio || "N/A"} | PEG: ${vm.pegRatio || "N/A"}`);
  }

  // DCF fair value
  const dcf = cp.dcfAnalysis;
  if (dcf?.dcfFairValue) {
    lines.push(`\n## FMP DCF Analysis`);
    lines.push(`DCF Fair Value: $${dcf.dcfFairValue} | Current Price: $${dcf.stockPrice} | Upside: ${dcf.upside?.toFixed(1)}%`);
  }

  // Peer multiples summary (keep lean)
  const peerCos = (peers.companies || []).slice(0, 8);
  if (peerCos.length > 0) {
    lines.push(`\n## Comparable Public Companies (${peerCos.length})`);
    const peerEVs = peerCos.map((p) => p.evEbitda).filter(Boolean);
    const peerPSs = peerCos.map((p) => p.evRevenue).filter(Boolean);
    const peerPEs = peerCos.map((p) => p.peRatio).filter(Boolean);
    const median = (arr) => {
      if (!arr.length) return null;
      const s = [...arr].sort((a, b) => a - b);
      const m = Math.floor(s.length / 2);
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    };
    lines.push(`Peer Median EV/EBITDA: ${median(peerEVs)?.toFixed(1) || "N/A"}x | EV/Revenue: ${median(peerPSs)?.toFixed(1) || "N/A"}x | P/E: ${median(peerPEs)?.toFixed(1) || "N/A"}x`);
    for (const p of peerCos.slice(0, 5)) {
      lines.push(`  ${p.companyName} (${p.symbol || "N/A"}): MCap ${p.marketCap || "N/A"} | EV/EBITDA ${p.evEbitda || "N/A"} | P/E ${p.peRatio || "N/A"}`);
    }
  }

  // M&A comps summary
  const deals = (peers.deals || []).slice(0, 6);
  if (deals.length > 0) {
    lines.push(`\n## Comparable M&A Deals (${deals.length})`);
    for (const d of deals.slice(0, 5)) {
      lines.push(`  ${d.target} acquired by ${d.acquirer}: $${d.dealValue || "?"}M | EV/Revenue ${d.evRevenue || "N/A"}x | EV/EBITDA ${d.evEbitda || "N/A"}x (${d.dealDate || "N/A"})`);
    }
  }

  // Financial projections summary (not the full blob)
  const proj = fin.projections;
  if (proj?.metrics?.revenue) {
    lines.push(`\n## Financial Projections`);
    const allYrs = [...(proj.historicalYears || []), ...(proj.forecastYears || [])];
    const revenueRow = allYrs.map((yr) => `${yr}: $${proj.metrics.revenue[yr] || "N/A"}`).join(" | ");
    lines.push(`Revenue: ${revenueRow}`);
    if (proj.metrics.ebitda) {
      const ebitdaRow = allYrs.map((yr) => `${yr}: $${proj.metrics.ebitda[yr] || "N/A"}`).join(" | ");
      lines.push(`EBITDA: ${ebitdaRow}`);
    }
    if (proj.metrics.freeCashFlow) {
      const fcfRow = allYrs.map((yr) => `${yr}: $${proj.metrics.freeCashFlow[yr] || "N/A"}`).join(" | ");
      lines.push(`FCF: ${fcfRow}`);
    }
    if (proj.metrics.netIncome) {
      const niRow = allYrs.map((yr) => `${yr}: $${proj.metrics.netIncome[yr] || "N/A"}`).join(" | ");
      lines.push(`Net Income: ${niRow}`);
    }
  }

  // Cap table
  if (cap?.shareClasses?.length) {
    lines.push(`\n## Cap Table`);
    lines.push(`Total Shares: ${cap.totalShares || "N/A"} | Total Debt: $${cap.totalDebt || 0}`);
    for (const sc of cap.shareClasses) {
      lines.push(`  ${sc.name} (${sc.type}): ${sc.shares} shares @ $${sc.pricePerShare}/share`);
    }
  }

  return lines.join("\n");
}

async function aiRunValuation(
  valuationId,
  userId,
  { methodologies },
  emitStep,
) {
  const valuation = await prisma.valuation.findFirst({
    where: { id: valuationId, userId },
  });
  if (!valuation) throw new Error("Valuation not found.");

  const startTime = Date.now();
  const companyProfile = valuation.companyProfile || {};
  const companyName = companyProfile.companyName || "Target Company";

  emitStep({
    id: "val_prepare",
    name: "Preparing Valuation Data",
    icon: "layers",
    status: "running",
    description: "Aggregating company, peers, financials, and cap table...",
    startedAt: startTime,
  });

  const valuationContext = buildValuationContext(valuation);

  const prepEnd = Date.now();
  emitStep({
    id: "val_prepare",
    name: "Preparing Valuation Data",
    icon: "layers",
    status: "completed",
    description: `Data aggregated for ${companyName}.`,
    completedAt: prepEnd,
    duration: prepEnd - startTime,
  });

  emitStep({
    id: "val_calculate",
    name: "Running Valuation Models",
    icon: "calculator",
    status: "running",
    description: `Computing ${methodologies.join(", ")} for ${companyName}...`,
    startedAt: prepEnd,
  });

  const marketCap = companyProfile.marketData?.marketCap;
  const ev = companyProfile.enterpriseMetrics?.enterpriseValue;
  const scaleHint = marketCap
    ? `\nSCALE REFERENCE: This company's market cap is ~$${marketCap}. Enterprise Value is ~$${ev || marketCap}. All EV and equity values in your response MUST be in FULL USD at this scale (e.g., ${marketCap} not ${marketCap / 1e9}).`
    : "";

  const valuationResponse = await openai.responses.create({
    model: env.OPENAI_MODEL,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `You are a Managing Director at Goldman Sachs running a valuation for a PE/VC/M&A engagement.
Compute valuations using: ${methodologies.join(", ")}.
${scaleHint}

CRITICAL: ALL dollar values (enterpriseValue, equityValue, sensitivityRange) MUST be in FULL USD.
Example: $65 billion = 65000000000 (NOT 65 or 65000)
Example: $500 million = 500000000

Return STRICT JSON (no markdown, no backticks):
{
  "methodResults": {
    "${methodologies[0]}": {
      "enterpriseValue": <number in full USD>,
      "equityValue": <number in full USD>,
      "impliedMultiple": { "evEbitda": <number>x, "evRevenue": <number>x, "peRatio": <number>x },
      "keyAssumptions": ["assumption 1", "assumption 2", ...],
      "confidenceLevel": "high"|"medium"|"low",
      "methodology": "<1 sentence description>",
      "sensitivityRange": { "low": <full USD>, "base": <full USD>, "high": <full USD> }
    }
    // ... repeat for each methodology
  },
  "weightedAverage": {
    "enterpriseValue": <full USD>,
    "equityValue": <full USD>,
    "weights": { "${methodologies[0]}": 0.5, ... },
    "impliedRange": { "low": <full USD>, "mid": <full USD>, "high": <full USD> }
  },
  "executiveSummary": "<2-3 paragraph PE/VC quality executive summary>",
  "keyFindings": ["finding 1", "finding 2", ...],
  "riskFactors": ["risk 1", "risk 2", ...],
  "recommendations": ["rec 1", "rec 2", ...]
}`,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Run full valuation analysis for ${companyName}:\n\n${valuationContext}`,
          },
        ],
      },
    ],
  });

  let valuationResults;
  let parseError = null;
  try {
    const text = valuationResponse.output_text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      parseError = "AI did not return valid JSON.";
    } else {
      valuationResults = JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    parseError = `JSON parse failed: ${err.message}`;
  }

  const calcEnd = Date.now();

  if (!valuationResults) {
    emitStep({
      id: "val_calculate",
      name: "Running Valuation Models",
      icon: "calculator",
      status: "error",
      description: parseError || "Valuation computation failed. Try again.",
      completedAt: calcEnd,
      duration: calcEnd - prepEnd,
    });
    throw new Error(parseError || "Valuation computation failed.");
  }

  emitStep({
    id: "val_calculate",
    name: "Running Valuation Models",
    icon: "calculator",
    status: "completed",
    description: `${Object.keys(valuationResults.methodResults || {}).length} methodologies computed.`,
    completedAt: calcEnd,
    duration: calcEnd - prepEnd,
  });

  emitStep({
    id: "val_insights",
    name: "Generating AI Insights",
    icon: "sparkles",
    status: "completed",
    description: `Executive summary, ${(valuationResults.keyFindings || []).length} findings, ${(valuationResults.recommendations || []).length} recommendations ready.`,
    completedAt: Date.now(),
    duration: 0,
  });

  const resultData = {
    ...valuationResults,
    methodologies,
    computedAt: new Date().toISOString(),
  };

  const completed = new Set(valuation.completedSteps);
  completed.add(6);

  await prisma.valuation.update({
    where: { id: valuationId },
    data: {
      calculations: resultData,
      completedSteps: [...completed].sort((a, b) => a - b),
      currentStep: Math.max(valuation.currentStep, 7),
      status: "IN_PROGRESS",
    },
  });

  return {
    calculations: resultData,
    timing: { totalDuration: Date.now() - startTime },
  };
}

module.exports = {
  createValuation,
  listValuations,
  getValuation,
  updateStep,
  deleteValuation,
  aiGenerateCompanyProfile,
  aiFindPeers,
  aiFetchFinancials,
  aiRunValuation,
};
