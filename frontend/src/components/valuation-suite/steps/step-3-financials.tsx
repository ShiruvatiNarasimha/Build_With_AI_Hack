"use client";

import { useState } from "react";
import {
  ArrowRight,
  Loader2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import {
  streamFinancials,
  type AgentStep,
  type Valuation,
} from "@/lib/valuation-suite-client";

interface StepProps {
  valuation: Valuation;
  accessToken: string;
  onSave: (
    step: number,
    data: Record<string, unknown>,
    markComplete?: boolean,
  ) => Promise<Valuation | null>;
  onRefresh: () => Promise<void>;
  onNext: () => void;
  agentSteps: AgentStep[];
  onAgentStep: (step: AgentStep) => void;
  clearAgentSteps: () => void;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
  
}

function isRatioMetric(key: string) {
  return /margin|growth|rate|tax/i.test(key);
}

function fmtAbsolute(num: number | null | undefined) {
  if (num == null || isNaN(num)) return "—";
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function fmtPercent(num: number | null | undefined) {
  if (num == null || isNaN(num)) return "—";
  return `${(num * 100).toFixed(1)}%`;
}

function fmtCell(metricKey: string, num: number | null | undefined) {
  if (num == null || isNaN(num)) return "—";
  if (isRatioMetric(metricKey)) return fmtPercent(num);
  return fmtAbsolute(num);
}

export function StepFinancials({
  valuation,
  accessToken,
  onRefresh,
  onNext,
  onAgentStep,
  clearAgentSteps,
  isProcessing,
  setIsProcessing,
}: StepProps) {
  const financials = valuation.financials;
  const projections = financials?.projections;
  const [symbol, setSymbol] = useState(financials?.symbol || "");
  const [forecastYears, setForecastYears] = useState(5);

  const handleFetch = async () => {
    clearAgentSteps();
    setIsProcessing(true);

    try {
      await streamFinancials(
        accessToken,
        valuation.id,
        {
          symbol: symbol.trim() || undefined,
          forecastYears,
        },
        {
          onStep: onAgentStep,
          onComplete: async () => {
            await onRefresh();
            toast.success("Financial data and projections ready!");
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to fetch financials.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const allYears = [
    ...(projections?.historicalYears || []),
    ...(projections?.forecastYears || []),
  ];
  const forecastStartIdx = projections?.historicalYears?.length || 0;

  const metricLabels: Record<string, string> = {
    revenue: "Revenue",
    revenueGrowth: "Revenue Growth",
    cogs: "Cost of Revenue",
    grossProfit: "Gross Profit",
    grossMargin: "Gross Margin",
    operatingExpenses: "Operating Expenses",
    ebitda: "EBITDA",
    ebitdaMargin: "EBITDA Margin",
    depreciation: "D&A",
    ebit: "EBIT / Operating Income",
    interestExpense: "Interest Expense",
    netIncome: "Net Income",
    netMargin: "Net Margin",
    freeCashFlow: "Free Cash Flow",
    capex: "CapEx",
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          Financial Data &amp; Projections
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Auto-pull historical financials via FMP and let AI generate projections
          for your valuation model.
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-end gap-4 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Ticker Symbol (optional)
          </label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="e.g. AAPL"
            className="w-32 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Forecast Years
          </label>
          <select
            value={forecastYears}
            onChange={(e) => setForecastYears(Number(e.target.value))}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            {[3, 5, 7, 10].map((y) => (
              <option key={y} value={y}>
                {y} years
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleFetch}
          disabled={isProcessing}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isProcessing
            ? "Fetching & Projecting..."
            : "Pull Data & Generate Projections"}
        </button>
      </div>

      {/* Financial Table */}
      {projections && allYears.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-white">
                {financials?.symbol
                  ? `${financials.symbol} — Financial Model`
                  : "Financial Model"}
              </h3>
              {projections.currency && (
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                  {projections.currency}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-600">
              {forecastStartIdx > 0
                ? `${forecastStartIdx}yr FMP historical + ${allYears.length - forecastStartIdx}yr AI forecast`
                : `${allYears.length}yr AI projections`}
            </p>
          </div>
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50">
                <th className="sticky left-0 bg-slate-900/90 px-4 py-3 text-left text-xs font-medium text-slate-400 min-w-[160px]">
                  Metric
                </th>
                {allYears.map((yr, i) => (
                  <th
                    key={yr}
                    className={`px-4 py-3 text-right text-xs font-medium min-w-[100px] ${
                      i >= forecastStartIdx
                        ? "text-emerald-400 bg-emerald-500/5"
                        : "text-slate-400"
                    }`}
                  >
                    {yr}
                    {i >= forecastStartIdx && (
                      <div className="text-[9px] text-emerald-500/60 font-normal">
                        Forecast
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(metricLabels).map(([key, label]) => {
                const values = projections.metrics?.[key];
                if (!values) return null;

                const isRatio = isRatioMetric(key);
                return (
                  <tr
                    key={key}
                    className={`border-b border-slate-800/50 hover:bg-slate-900/30 ${isRatio ? "bg-slate-900/20" : ""}`}
                  >
                    <td className={`sticky left-0 bg-slate-950/90 px-4 py-2.5 text-xs font-medium ${isRatio ? "text-slate-500 italic" : "text-slate-300"}`}>
                      {label}
                    </td>
                    {allYears.map((yr, i) => (
                      <td
                        key={yr}
                        className={`px-4 py-2.5 text-right font-mono text-xs ${
                          i >= forecastStartIdx
                            ? "text-emerald-300 bg-emerald-500/5"
                            : "text-slate-300"
                        }`}
                      >
                        {fmtCell(key, values[yr])}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {/* Assumptions & Risks */}
      {projections && (
        <div className="grid gap-4 sm:grid-cols-2">
          {projections.assumptions && projections.assumptions.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Key Assumptions
              </h4>
              <ul className="space-y-1.5">
                {projections.assumptions.map((a, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {projections.risks && projections.risks.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Risk Factors
              </h4>
              <ul className="space-y-1.5">
                {projections.risks.map((r, i) => (
                  <li key={i} className="text-sm text-amber-300 flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Continue */}
      {projections && (
        <div className="flex justify-end">
          <button
            onClick={onNext}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
          >
            Continue to Cap Table
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
