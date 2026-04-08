"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Lightbulb,
  Save,
  Shield,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import type { AgentStep, Valuation } from "@/lib/valuation-suite-client";

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
  if (abs >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(num / 1e3).toFixed(0)}K`;
  return `$${num.toLocaleString()}`;
}

export function StepResults({ valuation, onSave }: StepProps) {
  const calculations = valuation.calculations;
  const profile = valuation.companyProfile;
  const weighted = calculations?.weightedAverage;
  const [notes, setNotes] = useState("");

  if (!calculations) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <FileText className="h-5 w-5 text-violet-400" />
          Results &amp; Insights
        </h2>
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/20 p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-slate-600 mb-3" />
          <p className="text-slate-400 text-sm">
            No valuation results yet. Please run the valuation in Step 6 first.
          </p>
        </div>
      </div>
    );
  }

  const handleFinalize = async () => {
    const resultData = {
      finalized: true,
      finalizedAt: new Date().toISOString(),
      notes,
      summary: {
        companyName: profile?.companyName,
        enterpriseValue: weighted?.enterpriseValue,
        equityValue: weighted?.equityValue,
        range: weighted?.impliedRange,
        methodologies: calculations.methodologies,
      },
    };

    const result = await onSave(7, resultData, true);
    if (result) toast.success("Valuation finalized!");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <FileText className="h-5 w-5 text-violet-400" />
          Valuation Results &amp; AI Insights
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Final valuation output for {profile?.companyName || "the target company"}.
        </p>
      </div>

      {/* Summary Card */}
      {weighted && (
        <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/5 via-slate-900 to-purple-500/5 p-8">
          <div className="text-center mb-6">
            <p className="text-xs text-violet-400 uppercase tracking-wider mb-2">
              {profile?.companyName || "Target Company"} — Estimated Valuation
            </p>
            <p className="text-4xl font-bold text-white font-mono">
              {fmtValue(weighted.equityValue)}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Equity Value
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6 border-t border-slate-800 pt-6">
            <div className="text-center">
              <p className="text-[10px] text-slate-500 uppercase mb-1">
                Enterprise Value
              </p>
              <p className="text-lg font-bold text-white font-mono">
                {fmtValue(weighted.enterpriseValue)}
              </p>
            </div>
            {weighted.impliedRange && (
              <>
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase mb-1">
                    Low Range
                  </p>
                  <p className="text-lg font-bold text-amber-400 font-mono">
                    {fmtValue(weighted.impliedRange.low)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase mb-1">
                    High Range
                  </p>
                  <p className="text-lg font-bold text-blue-400 font-mono">
                    {fmtValue(weighted.impliedRange.high)}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Executive Summary */}
      {calculations.executiveSummary && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-violet-400" />
            Executive Summary
          </h3>
          <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {calculations.executiveSummary}
          </div>
        </div>
      )}

      {/* Key Findings & Risks */}
      <div className="grid gap-4 sm:grid-cols-2">
        {calculations.keyFindings && calculations.keyFindings.length > 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h4 className="text-xs font-semibold text-emerald-400 flex items-center gap-2 uppercase tracking-wider mb-3">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Key Findings
            </h4>
            <ul className="space-y-2">
              {calculations.keyFindings.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {calculations.riskFactors && calculations.riskFactors.length > 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h4 className="text-xs font-semibold text-amber-400 flex items-center gap-2 uppercase tracking-wider mb-3">
              <AlertTriangle className="h-3.5 w-3.5" />
              Risk Factors
            </h4>
            <ul className="space-y-2">
              {calculations.riskFactors.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-amber-400 mt-0.5 shrink-0">⚠</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {calculations.recommendations && calculations.recommendations.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h4 className="text-xs font-semibold text-blue-400 flex items-center gap-2 uppercase tracking-wider mb-3">
            <Lightbulb className="h-3.5 w-3.5" />
            AI Recommendations
          </h4>
          <ul className="space-y-2">
            {calculations.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-blue-400 mt-0.5 shrink-0">→</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Analyst Notes */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Analyst Notes (Optional)
        </h4>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add your notes, caveats, or adjustments here..."
          rows={4}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none resize-none"
        />
      </div>

      {/* Finalize */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Shield className="h-3.5 w-3.5" />
          All data stored securely in your account
        </div>
        <button
          onClick={handleFinalize}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:brightness-110"
        >
          <Save className="h-4 w-4" />
          Finalize Valuation
        </button>
      </div>
    </div>
  );
}
