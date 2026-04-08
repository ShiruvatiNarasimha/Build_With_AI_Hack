const { env } = require("../config/env");

const FMP_BASE = "https://financialmodelingprep.com/api/v3";

async function fmpFetch(endpoint) {
  const separator = endpoint.includes("?") ? "&" : "?";
  const url = `${FMP_BASE}${endpoint}${separator}apikey=${env.FMP_API_KEY}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });

  if (!res.ok) {
    throw new Error(`FMP ${res.status}: ${endpoint}`);
  }

  return res.json();
}

async function searchSymbol(query) {
  const data = await fmpFetch(
    `/search?query=${encodeURIComponent(query)}&limit=3`,
  );
  return Array.isArray(data) ? data : [];
}

async function getCompanyProfile(symbol) {
  const data = await fmpFetch(`/profile/${symbol}`);
  return data?.[0] ?? null;
}

async function getQuote(symbol) {
  const data = await fmpFetch(`/quote/${symbol}`);
  return data?.[0] ?? null;
}

async function getIncomeStatement(symbol, limit = 4) {
  return fmpFetch(`/income-statement/${symbol}?limit=${limit}`);
}

async function getFinancialRatios(symbol, limit = 4) {
  return fmpFetch(`/ratios/${symbol}?limit=${limit}`);
}

async function getKeyMetrics(symbol, limit = 4) {
  return fmpFetch(`/key-metrics/${symbol}?limit=${limit}`);
}

async function getDCF(symbol) {
  const data = await fmpFetch(`/discounted-cash-flow/${symbol}`);
  return data?.[0] ?? null;
}

async function getFinancialGrowth(symbol, limit = 4) {
  return fmpFetch(`/financial-growth/${symbol}?limit=${limit}`);
}

async function getHistoricalPrice(symbol, days = 180) {
  return fmpFetch(`/historical-price-full/${symbol}?timeseries=${days}`);
}

async function getAnalystEstimates(symbol, limit = 4) {
  return fmpFetch(`/analyst-estimates/${symbol}?limit=${limit}`);
}

const ENDPOINT_MAP = {
  profile: getCompanyProfile,
  quote: getQuote,
  "income-statement": (s) => getIncomeStatement(s),
  ratios: (s) => getFinancialRatios(s),
  "key-metrics": (s) => getKeyMetrics(s),
  dcf: getDCF,
  growth: (s) => getFinancialGrowth(s),
  "price-history": (s) => getHistoricalPrice(s),
  "analyst-estimates": (s) => getAnalystEstimates(s),
};

async function fetchFinancialData(symbol, endpoints) {
  const toFetch = endpoints.filter((ep) => ENDPOINT_MAP[ep]);

  const settled = await Promise.allSettled(
    toFetch.map(async (ep) => ({
      endpoint: ep,
      data: await ENDPOINT_MAP[ep](symbol),
    })),
  );

  const results = {};
  const errors = [];

  for (const result of settled) {
    if (result.status === "fulfilled") {
      results[result.value.endpoint] = result.value.data;
    } else {
      errors.push(result.reason?.message ?? "unknown");
    }
  }

  return { results, errors, fetched: Object.keys(results).length };
}

/* ─── Format data into concise text for the AI ─── */

function fmt(num) {
  if (num == null || isNaN(num)) return "N/A";
  const abs = Math.abs(num);
  if (abs >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return Number(num).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function pct(num) {
  if (num == null || isNaN(num)) return "N/A";
  return `${(num * 100).toFixed(1)}%`;
}

function formatFinancialDataForAI(symbol, data) {
  const sections = [];

  if (data.profile) {
    const p = data.profile;
    sections.push(
      `### ${p.companyName} (${symbol}) — Company Profile`,
      `Sector: ${p.sector} | Industry: ${p.industry}`,
      `Market Cap: $${fmt(p.mktCap)} | Price: $${p.price} | Beta: ${p.beta}`,
      `Employees: ${fmt(p.fullTimeEmployees)} | CEO: ${p.ceo}`,
      `Exchange: ${p.exchangeShortName} | IPO: ${p.ipoDate}`,
      "",
    );
  }

  if (data.quote) {
    const q = data.quote;
    sections.push(
      `### Live Quote`,
      `Price: $${q.price} | Change: ${q.changesPercentage?.toFixed(2)}%`,
      `Day Range: $${q.dayLow} – $${q.dayHigh}`,
      `52-Week Range: $${q.yearLow} – $${q.yearHigh}`,
      `Volume: ${fmt(q.volume)} | Avg Volume: ${fmt(q.avgVolume)}`,
      `P/E: ${q.pe?.toFixed(2)} | EPS: $${q.eps?.toFixed(2)}`,
      `Market Cap: $${fmt(q.marketCap)}`,
      "",
    );
  }

  if (data["income-statement"]?.length) {
    const stmts = data["income-statement"].slice(0, 3);
    sections.push(`### Income Statement (last ${stmts.length} years)`);
    for (const s of stmts) {
      sections.push(
        `${s.date}: Revenue $${fmt(s.revenue)} | Net Income $${fmt(s.netIncome)} | EPS $${s.eps?.toFixed(2)} | Margin ${pct(s.netIncomeRatio)}`,
      );
    }
    const [curr, prev] = stmts;
    if (prev?.revenue && curr?.revenue) {
      const revGrowth = (curr.revenue - prev.revenue) / prev.revenue;
      sections.push(`Revenue YoY Growth: ${pct(revGrowth)}`);
    }
    sections.push("");
  }

  if (data.ratios?.length) {
    const r = data.ratios[0];
    sections.push(
      `### Financial Ratios (Latest)`,
      `P/E: ${r.priceEarningsRatio?.toFixed(2)} | P/B: ${r.priceToBookRatio?.toFixed(2)} | P/S: ${r.priceToSalesRatio?.toFixed(2)} | EV/EBITDA: ${r.enterpriseValueMultiple?.toFixed(2)}`,
      `ROE: ${pct(r.returnOnEquity)} | ROA: ${pct(r.returnOnAssets)} | ROIC: ${pct(r.returnOnCapitalEmployed)}`,
      `Debt/Equity: ${r.debtEquityRatio?.toFixed(2)} | Current: ${r.currentRatio?.toFixed(2)}`,
      `Gross Margin: ${pct(r.grossProfitMargin)} | Operating Margin: ${pct(r.operatingProfitMargin)} | Net Margin: ${pct(r.netProfitMargin)}`,
      `Dividend Yield: ${pct(r.dividendYield)} | Payout Ratio: ${pct(r.payoutRatio)}`,
      "",
    );
  }

  if (data["key-metrics"]?.length) {
    const k = data["key-metrics"][0];
    sections.push(
      `### Key Metrics`,
      `EV: $${fmt(k.enterpriseValue)} | EV/EBITDA: ${k.enterpriseValueOverEBITDA?.toFixed(2)}`,
      `Revenue/Share: $${k.revenuePerShare?.toFixed(2)} | FCF/Share: $${k.freeCashFlowPerShare?.toFixed(2)}`,
      `Book Value/Share: $${k.bookValuePerShare?.toFixed(2)} | Tangible Book: $${k.tangibleBookValuePerShare?.toFixed(2)}`,
      "",
    );
  }

  if (data.dcf) {
    const d = data.dcf;
    sections.push(
      `### DCF Intrinsic Valuation`,
      `DCF Fair Value: $${d.dcf?.toFixed(2)} | Stock Price: $${d["Stock Price"]?.toFixed(2)}`,
      `Date: ${d.date}`,
      "",
    );
  }

  if (data.growth?.length) {
    const g = data.growth[0];
    sections.push(
      `### Financial Growth (Latest Period)`,
      `Revenue Growth: ${pct(g.revenueGrowth)} | Net Income Growth: ${pct(g.netIncomeGrowth)}`,
      `EPS Growth: ${pct(g.epsgrowth)} | Dividend Growth: ${pct(g.dividendsperShareGrowth)}`,
      `FCF Growth: ${pct(g.freeCashFlowGrowth)}`,
      "",
    );
  }

  if (data["price-history"]?.historical?.length) {
    const prices = data["price-history"].historical;
    const latest = prices[0];
    const d30 = prices[Math.min(21, prices.length - 1)];
    const d90 = prices[Math.min(63, prices.length - 1)];
    const high52 = Math.max(
      ...prices.slice(0, Math.min(252, prices.length)).map((p) => p.high),
    );
    const low52 = Math.min(
      ...prices.slice(0, Math.min(252, prices.length)).map((p) => p.low),
    );
    const chg30 = d30
      ? (((latest.close - d30.close) / d30.close) * 100).toFixed(1)
      : "N/A";
    const chg90 = d90
      ? (((latest.close - d90.close) / d90.close) * 100).toFixed(1)
      : "N/A";
    sections.push(
      `### Price Performance`,
      `Current: $${latest.close} (${latest.date})`,
      `30-Day: ${chg30}% | 90-Day: ${chg90}%`,
      `52-Week High: $${high52.toFixed(2)} | Low: $${low52.toFixed(2)}`,
      "",
    );
  }

  if (data["analyst-estimates"]?.length) {
    const est = data["analyst-estimates"][0];
    sections.push(
      `### Analyst Estimates (${est.date})`,
      `Est. Revenue: $${fmt(est.estimatedRevenueAvg)} (Low: $${fmt(est.estimatedRevenueLow)} – High: $${fmt(est.estimatedRevenueHigh)})`,
      `Est. EPS: $${est.estimatedEpsAvg?.toFixed(2)} (Low: $${est.estimatedEpsLow?.toFixed(2)} – High: $${est.estimatedEpsHigh?.toFixed(2)})`,
      `Number of Analysts: ${est.numberAnalystsEstimatedRevenue}`,
      "",
    );
  }

  return sections.join("\n") || "No financial data available.";
}

module.exports = {
  searchSymbol,
  fetchFinancialData,
  formatFinancialDataForAI,
  ENDPOINT_MAP,
};
