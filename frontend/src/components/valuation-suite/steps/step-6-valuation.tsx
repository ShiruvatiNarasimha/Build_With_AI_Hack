"use client";

import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calculator,
  CheckCircle2,
  Loader2,
  Sparkles,
  Target,
} from "lucide-react";
import { toast } from "sonner";

import {
  streamValuation,
  type AgentStep,
  type CalculationsData,
  type MethodResult,
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

function fmtValue(num: number | null | undefined) {
  if (num == null || isNaN(num)) return "—";
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toLocaleString()}`;
}

const CONFIDENCE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "High Confidence" },
  medium: { bg: "bg-amber-500/10", text: "text-amber-400", label: "Medium" },
  low: { bg: "bg-red-500/10", text: "text-red-400", label: "Low" },
};

const METHOD_LABELS: Record<string, { label: string; color: string }> = {
  dcf: { label: "Discounted Cash Flow", color: "violet" },
  "trading-multiples": { label: "Trading Multiples", color: "blue" },
  "ma-transactions": { label: "M&A Comps", color: "emerald" },
  "startup-valuation": { label: "Startup / VC", color: "amber" },
};

export function StepValuation({
  valuation,
  accessToken,
  onRefresh,
  onNext,
  onAgentStep,
  clearAgentSteps,
  isProcessing,
  setIsProcessing,
}: StepProps) {
  const calculations = valuation.calculations;
  const methods = valuation.methods;
  const profile = valuation.companyProfile;

  const selectedMethodologies = methods
    ? Object.entries(methods)
        .filter(([, v]) => (v as { enabled?: boolean })?.enabled)
        .map(([k]) => k)
    : ["dcf", "trading-multiples"];

  const handleRunValuation = async () => {
    clearAgentSteps();
    setIsProcessing(true);

    try {
      await streamValuation(
        accessToken,
        valuation.id,
        { methodologies: selectedMethodologies },
        {
          onStep: onAgentStep,
          onComplete: async () => {
            await onRefresh();
            toast.success("Valuation complete!");
          },
          onError: (err) => {
            toast.error(err.message || "Valuation failed.");
          },
        },
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Valuation request failed.";
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const methodResults = calculations?.methodResults || {};
  const weighted = calculations?.weightedAverage;
  const hasResults = Object.keys(methodResults).length > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Calculator className="h-5 w-5 text-violet-400" />
          Run Valuation
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          AI will compute{" "}
          {selectedMethodologies
            .map((m) => METHOD_LABELS[m]?.label || m)
            .join(", ")}{" "}
          for {profile?.companyName || "the target company"} and synthesize a
          weighted result.
        </p>
      </div>

      {/* Pre-run checklist */}
      {!hasResults && !isProcessing && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Data Ready for Valuation
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            <CheckItem label="Company Profile" done={!!profile?.companyName} />
            <CheckItem
              label="Peer Companies"
              done={(valuation.peers?.companies?.length ?? 0) > 0}
            />
            <CheckItem
              label="Financial Projections"
              done={!!valuation.financials?.projections}
            />
            <CheckItem
              label="Valuation Methods Selected"
              done={selectedMethodologies.length > 0}
              detail={`${selectedMethodologies.length} method(s)`}
            />
          </div>
        </div>
      )}

      {/* Run Button */}
      <button
        onClick={handleRunValuation}
        disabled={isProcessing || selectedMethodologies.length === 0}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {isProcessing
          ? "Computing Valuation..."
          : hasResults
            ? "Re-run Valuation"
            : "Run AI Valuation"}
      </button>

      {/* Results */}
      {hasResults && <ValuationResults calculations={calculations!} profile={profile} onNext={onNext} />}
    </div>
  );
}

/* ─────────────── Results Sub-Component ─────────────── */

function ValuationResults({
  calculations,
  profile,
  onNext,
}: {
  calculations: CalculationsData;
  profile: Valuation["companyProfile"];
  onNext: () => void;
}) {
  const methodResults = calculations.methodResults || {};
  const weighted = calculations.weightedAverage;

  return (
    <div className="space-y-6">
      {/* Weighted Average Hero */}
      {weighted && (
        <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/5 via-slate-900 to-purple-500/5 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-violet-400" />
            <h3 className="text-xs font-semibold text-violet-400 uppercase tracking-wider">
              {profile?.companyName || "Target"} — Weighted Valuation
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div>
              <p className="text-[10px] text-slate-500 uppercase mb-1">
                Enterprise Value
              </p>
              <p className="text-2xl font-bold text-white font-mono">
                {fmtValue(weighted.enterpriseValue)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase mb-1">
                Equity Value
              </p>
              <p className="text-2xl font-bold text-emerald-400 font-mono">
                {fmtValue(weighted.equityValue)}
              </p>
            </div>
            {weighted.impliedRange && (
              <>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase mb-1">
                    Low Estimate
                  </p>
                  <p className="text-lg font-semibold text-amber-400 font-mono">
                    {fmtValue(weighted.impliedRange.low)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase mb-1">
                    High Estimate
                  </p>
                  <p className="text-lg font-semibold text-blue-400 font-mono">
                    {fmtValue(weighted.impliedRange.high)}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Valuation Range Bar */}
          {weighted.impliedRange && (
            <div className="mt-4 pt-4 border-t border-slate-800/50">
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5">
                <span>Bear: {fmtValue(weighted.impliedRange.low)}</span>
                <span className="text-violet-400 font-medium">
                  Base: {fmtValue(weighted.impliedRange.mid)}
                </span>
                <span>Bull: {fmtValue(weighted.impliedRange.high)}</span>
              </div>
              <div className="h-3 rounded-full bg-slate-800 overflow-hidden relative">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-500 via-emerald-500 to-blue-500 opacity-80" />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white"
                  style={{
                    left: `${
                      weighted.impliedRange.high > weighted.impliedRange.low
                        ? ((weighted.impliedRange.mid - weighted.impliedRange.low) /
                            (weighted.impliedRange.high - weighted.impliedRange.low)) *
                          100
                        : 50
                    }%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Weights */}
          {weighted.weights && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(weighted.weights).map(([method, w]) => {
                const ml = METHOD_LABELS[method];
                return (
                  <span
                    key={method}
                    className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300"
                  >
                    {ml?.label || method}: {((w as number) * 100).toFixed(0)}%
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Method-by-Method Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(methodResults).map(([method, result]) => (
          <MethodCard key={method} method={method} result={result} />
        ))}
      </div>

      {/* Executive Summary */}
      {calculations.executiveSummary && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-violet-400" />
            Executive Summary
          </h4>
          <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {calculations.executiveSummary}
          </div>
        </div>
      )}

      {/* Key Findings */}
      {calculations.keyFindings && calculations.keyFindings.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">
            Key Findings
          </h4>
          <ul className="space-y-2">
            {calculations.keyFindings.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Continue */}
      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
        >
          View Results &amp; Insights
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ──────────── Method Card ──────────── */

function MethodCard({
  method,
  result,
}: {
  method: string;
  result: MethodResult;
}) {
  const ml = METHOD_LABELS[method] || { label: method, color: "slate" };
  const conf = result.confidenceLevel
    ? CONFIDENCE_STYLES[result.confidenceLevel]
    : null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-white">{ml.label}</h4>
        {conf && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${conf.bg} ${conf.text}`}
          >
            {conf.label}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-[10px] text-slate-500 mb-0.5">Enterprise Value</p>
          <p className="text-base font-bold text-white font-mono">
            {fmtValue(result.enterpriseValue)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 mb-0.5">Equity Value</p>
          <p className="text-base font-bold text-emerald-400 font-mono">
            {fmtValue(result.equityValue)}
          </p>
        </div>
      </div>

      {/* Implied Multiples */}
      {result.impliedMultiple && (
        <div className="flex flex-wrap gap-2 mb-3">
          {result.impliedMultiple.evEbitda != null && (
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400 font-mono">
              EV/EBITDA {result.impliedMultiple.evEbitda.toFixed(1)}x
            </span>
          )}
          {result.impliedMultiple.evRevenue != null && (
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400 font-mono">
              EV/Rev {result.impliedMultiple.evRevenue.toFixed(1)}x
            </span>
          )}
          {result.impliedMultiple.peRatio != null && (
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400 font-mono">
              P/E {result.impliedMultiple.peRatio.toFixed(1)}x
            </span>
          )}
        </div>
      )}

      {/* Sensitivity Range */}
      {result.sensitivityRange && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>{fmtValue(result.sensitivityRange.low)}</span>
            <span className="text-slate-400">
              {fmtValue(result.sensitivityRange.base)}
            </span>
            <span>{fmtValue(result.sensitivityRange.high)}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden relative">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-500/70 via-emerald-500/70 to-blue-500/70" />
          </div>
        </div>
      )}

      {/* Key Assumptions */}
      {result.keyAssumptions && result.keyAssumptions.length > 0 && (
        <div className="border-t border-slate-800 pt-3 mt-3">
          <p className="text-[10px] text-slate-500 mb-1.5">Key Assumptions</p>
          <ul className="space-y-1">
            {result.keyAssumptions.slice(0, 4).map((a, i) => (
              <li key={i} className="text-[11px] text-slate-400">
                • {a}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ──────────── CheckItem ──────────── */

function CheckItem({
  label,
  done,
  detail,
}: {
  label: string;
  done: boolean;
  detail?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {done ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-amber-400" />
      )}
      <span className={`text-sm ${done ? "text-slate-300" : "text-amber-300"}`}>
        {label}
      </span>
      {detail && (
        <span className="text-[10px] text-slate-500">{detail}</span>
      )}
    </div>
  );
}
