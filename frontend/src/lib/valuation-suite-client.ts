import { clientEnv } from "@/lib/env";

/* ─── Types ─── */

export interface AgentStep {
  id: string;
  name: string;
  icon: string;
  status: "pending" | "running" | "completed" | "error";
  description: string;
  startedAt?: number;
  completedAt?: number;
  duration?: number;
  detail?: string;
}

export interface Valuation {
  id: string;
  name: string;
  status: "DRAFT" | "IN_PROGRESS" | "COMPLETED";
  currentStep: number;
  completedSteps: number[];
  companyProfile: CompanyProfile | null;
  peers: PeerData | null;
  financials: FinancialData | null;
  capTable: CapTableData | null;
  methods: MethodsData | null;
  calculations: CalculationsData | null;
  results: ResultsData | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyProfile {
  companyName: string;
  legalName?: string;
  ticker?: string | null;
  exchange?: string | null;
  ipoDate?: string | null;
  ceo?: string | null;
  website?: string;
  linkedin?: string;
  industry: string;
  sector: string;
  subSector?: string;
  country: string;
  region?: string;
  foundedYear?: number;
  headquarters?: string;
  employees?: string;
  stage?: string;
  revenueRange?: string;
  description?: string;
  fmpDescription?: string;
  businessModel?: string;
  keyProducts?: string[];
  targetMarket?: string;
  competitors?: string[];
  keywords?: string[];
  strengths?: string[];
  risks?: string[];
  recentNews?: string[];
  managementTeam?: { name: string; title: string; background: string }[];
  fundingHistory?: string[];
  moat?: string;
  exitComparables?: string[];
  dataSource?: "fmp+ai" | "ai";
  lastUpdated?: string;

  marketData?: {
    price: number;
    change: number;
    changePercent: number;
    marketCap: number;
    volume: number;
    avgVolume: number;
    dayLow: number;
    dayHigh: number;
    yearLow: number;
    yearHigh: number;
    pe: number;
    eps: number;
    sharesOutstanding: number;
  };

  valuationMultiples?: {
    peRatio?: number | null;
    pbRatio?: number | null;
    psRatio?: number | null;
    evEbitda?: number | null;
    pegRatio?: number | null;
    priceToFcf?: number | null;
    evRevenue?: number | null;
  };

  profitability?: {
    grossMargin?: number | null;
    operatingMargin?: number | null;
    netMargin?: number | null;
    roe?: number | null;
    roa?: number | null;
    roic?: number | null;
  };

  capitalStructure?: {
    debtToEquity?: number | null;
    currentRatio?: number | null;
    quickRatio?: number | null;
    interestCoverage?: number | null;
    debtToAssets?: number | null;
    dividendYield?: number | null;
    payoutRatio?: number | null;
  };

  enterpriseMetrics?: {
    enterpriseValue?: number | null;
    evToEbitda?: number | null;
    evToRevenue?: number | null;
    evToFcf?: number | null;
    revenuePerShare?: number | null;
    fcfPerShare?: number | null;
    bookValuePerShare?: number | null;
    tangibleBookPerShare?: number | null;
    netDebt?: number | null;
  };

  dcfAnalysis?: {
    dcfFairValue?: number | null;
    stockPrice?: number | null;
    upside?: number | null;
    date?: string;
  };

  growthMetrics?: {
    revenueGrowth?: number | null;
    netIncomeGrowth?: number | null;
    epsGrowth?: number | null;
    fcfGrowth?: number | null;
    grossProfitGrowth?: number | null;
    ebitdaGrowth?: number | null;
    rdExpenseGrowth?: number | null;
    sgaGrowth?: number | null;
  };

  analystEstimates?: {
    date?: string;
    estimatedRevenueAvg?: number;
    estimatedRevenueLow?: number;
    estimatedRevenueHigh?: number;
    estimatedEpsAvg?: number;
    estimatedEpsLow?: number;
    estimatedEpsHigh?: number;
    numberOfAnalysts?: number;
    estimatedNetIncomeAvg?: number;
    estimatedEbitdaAvg?: number;
  };

  incomeSnapshot?: {
    date: string;
    period: string;
    revenue: number;
    grossProfit: number;
    operatingIncome: number;
    ebitda: number;
    netIncome: number;
    eps: number;
    grossMargin: number;
    operatingMargin: number;
    netMargin: number;
  }[];

  investmentThesis?: string;
  qualityScore?: number;
  qualityFactors?: {
    management: number;
    marketPosition: number;
    financials: number;
    growth: number;
    moat: number;
  };
  keyMetricsHighlight?: string[];
  redFlags?: string[];
  catalysts?: string[];
}

export interface PeerData {
  companies: PeerCompany[];
  deals: MaDeal[];
  updatedAt: string;
}

export interface PeerCompany {
  symbol?: string;
  companyName: string;
  industry?: string;
  sector?: string;
  country?: string;
  marketCap?: number;
  evEbitda?: number;
  evRevenue?: number;
  peRatio?: number;
  revenueGrowth?: number;
  similarityScore?: number;
  matchReason?: string;
}

export interface MaDeal {
  target: string;
  acquirer: string;
  dealValue?: number;
  dealDate?: string;
  evRevenue?: number;
  evEbitda?: number;
  industry?: string;
  sector?: string;
  description?: string;
  similarityScore?: number;
}

export interface FinancialData {
  symbol?: string | null;
  historical: Record<string, unknown> | null;
  projections: FinancialProjections | null;
  updatedAt: string;
}

export interface FinancialProjections {
  currency?: string;
  historicalYears?: string[];
  forecastYears?: string[];
  metrics?: Record<string, Record<string, number>>;
  assumptions?: string[];
  risks?: string[];
}

export interface CapTableData {
  shareClasses: ShareClass[];
  debtInstruments: DebtInstrument[];
  totalShares?: number;
  totalDebt?: number;
}

export interface ShareClass {
  id: string;
  name: string;
  type: string;
  shares: number;
  pricePerShare: number;
  liquidationPreference?: number;
  votingRights?: boolean;
  participatingPreferred?: boolean;
}

export interface DebtInstrument {
  id: string;
  name: string;
  type: string;
  principal: number;
  interestRate: number;
  maturityDate?: string;
  convertible?: boolean;
  conversionPrice?: number;
}

export type MethodsData = Record<string, MethodConfig>;

export interface MethodConfig {
  enabled: boolean;
  weight: number;
  assumptions: Record<string, unknown>;
}

export interface CalculationsData {
  methodResults?: Record<string, MethodResult>;
  weightedAverage?: WeightedAverage;
  executiveSummary?: string;
  keyFindings?: string[];
  riskFactors?: string[];
  recommendations?: string[];
  methodologies?: string[];
  computedAt?: string;
}

export interface MethodResult {
  enterpriseValue: number;
  equityValue: number;
  impliedMultiple?: {
    evEbitda?: number;
    evRevenue?: number;
    peRatio?: number;
  };
  keyAssumptions?: string[];
  confidenceLevel?: "high" | "medium" | "low";
  methodology?: string;
  sensitivityRange?: { low: number; base: number; high: number };
}

export interface WeightedAverage {
  enterpriseValue: number;
  equityValue: number;
  weights?: Record<string, number>;
  impliedRange?: { low: number; mid: number; high: number };
}

export type ResultsData = Record<string, unknown>;

export interface StreamCallbacks {
  onStep: (step: AgentStep) => void;
  onComplete: (result: Record<string, unknown>) => void;
  onError: (error: Error) => void;
}

/* ─── API Helpers ─── */

class ValuationSuiteError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ValuationSuiteError";
    this.status = status;
    this.details = details;
  }
}

async function apiFetch<T>(
  path: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${clientEnv.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ValuationSuiteError(
      body?.message || `Request failed (${res.status})`,
      res.status,
      body?.details,
    );
  }

  const json = await res.json();
  return json.data as T;
}

async function streamRequest(
  path: string,
  accessToken: string,
  body: Record<string, unknown>,
  callbacks: StreamCallbacks,
): Promise<void> {
  const res = await fetch(`${clientEnv.apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ValuationSuiteError(text || "Streaming failed.", res.status);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new ValuationSuiteError("No stream available.", 500);

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        if (!part.trim()) continue;
        const lines = part.split("\n");
        let eventType = "";
        let data = "";

        for (const line of lines) {
          if (line.startsWith("event: ")) eventType = line.slice(7).trim();
          else if (line.startsWith("data: ")) data = line.slice(6);
        }

        if (!eventType || !data) continue;

        try {
          const parsed = JSON.parse(data);
          switch (eventType) {
            case "step":
              callbacks.onStep(parsed as AgentStep);
              break;
            case "complete":
              callbacks.onComplete(parsed);
              break;
            case "error":
              callbacks.onError(new Error(parsed.message || "Stream error."));
              break;
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/* ─── Public API ─── */

export async function createValuation(
  accessToken: string,
  name?: string,
): Promise<Valuation> {
  return apiFetch<Valuation>("/valuations", accessToken, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function listValuations(
  accessToken: string,
): Promise<Valuation[]> {
  return apiFetch<Valuation[]>("/valuations", accessToken);
}

export async function getValuation(
  accessToken: string,
  id: string,
): Promise<Valuation> {
  return apiFetch<Valuation>(`/valuations/${id}`, accessToken);
}

export async function updateValuationStep(
  accessToken: string,
  id: string,
  step: number,
  data: Record<string, unknown>,
  markComplete = false,
): Promise<Valuation> {
  return apiFetch<Valuation>(`/valuations/${id}/step/${step}`, accessToken, {
    method: "PUT",
    body: JSON.stringify({ data, markComplete }),
  });
}

export async function deleteValuation(
  accessToken: string,
  id: string,
): Promise<void> {
  await apiFetch(`/valuations/${id}`, accessToken, { method: "DELETE" });
}

export async function streamCompanyProfile(
  accessToken: string,
  valuationId: string,
  input: {
    companyName: string;
    website?: string;
    linkedin?: string;
    description?: string;
  },
  callbacks: StreamCallbacks,
): Promise<void> {
  return streamRequest(
    `/valuations/${valuationId}/ai/company-profile`,
    accessToken,
    input,
    callbacks,
  );
}

export async function streamPeerFinder(
  accessToken: string,
  valuationId: string,
  input: {
    industry?: string;
    sector?: string;
    country?: string;
    keywords?: string[];
    topN?: number;
  },
  callbacks: StreamCallbacks,
): Promise<void> {
  return streamRequest(
    `/valuations/${valuationId}/ai/peers`,
    accessToken,
    input,
    callbacks,
  );
}

export async function streamFinancials(
  accessToken: string,
  valuationId: string,
  input: { symbol?: string; forecastYears?: number },
  callbacks: StreamCallbacks,
): Promise<void> {
  return streamRequest(
    `/valuations/${valuationId}/ai/financials`,
    accessToken,
    input,
    callbacks,
  );
}

export async function streamValuation(
  accessToken: string,
  valuationId: string,
  input: { methodologies: string[] },
  callbacks: StreamCallbacks,
): Promise<void> {
  return streamRequest(
    `/valuations/${valuationId}/ai/valuation`,
    accessToken,
    input,
    callbacks,
  );
}
