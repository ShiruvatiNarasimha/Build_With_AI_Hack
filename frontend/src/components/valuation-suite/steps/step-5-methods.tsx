"use client";

import { useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Calculator,
  GitMerge,
  LineChart,
  Rocket,
  Save,
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

const METHODOLOGIES = [
  {
    id: "dcf",
    name: "Discounted Cash Flow (DCF)",
    icon: LineChart,
    color: "violet",
    description:
      "Project future free cash flows and discount them to present value using WACC. Best for companies with predictable cash flows.",
    bestFor: "Mature companies, stable cash flows",
    inputs: "WACC, Terminal growth rate, Forecast period",
  },
  {
    id: "trading-multiples",
    name: "Trading Multiples",
    icon: BarChart3,
    color: "blue",
    description:
      "Apply peer group median multiples (EV/EBITDA, EV/Revenue, P/E) to your company's metrics. Market-driven approach.",
    bestFor: "Companies with public peers",
    inputs: "Peer group selection, Multiple selection",
  },
  {
    id: "ma-transactions",
    name: "M&A Transaction Comps",
    icon: GitMerge,
    color: "emerald",
    description:
      "Use multiples from comparable M&A deals to estimate what an acquirer might pay. Includes control premium.",
    bestFor: "M&A advisory, exit planning",
    inputs: "Deal selection, Control premium",
  },
  {
    id: "startup-valuation",
    name: "Startup / VC Method",
    icon: Rocket,
    color: "amber",
    description:
      "Scorecard, checklist, and VC methods for pre-revenue or early-stage companies. Risk-adjusted approach.",
    bestFor: "Pre-revenue, early-stage companies",
    inputs: "Exit multiple, IRR, Timeframe",
  },
] as const;

const colorMap: Record<string, { bg: string; border: string; text: string; check: string }> = {
  violet: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/50 ring-1 ring-violet-500/20",
    text: "text-violet-400",
    check: "bg-violet-500",
  },
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/50 ring-1 ring-blue-500/20",
    text: "text-blue-400",
    check: "bg-blue-500",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/50 ring-1 ring-emerald-500/20",
    text: "text-emerald-400",
    check: "bg-emerald-500",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/50 ring-1 ring-amber-500/20",
    text: "text-amber-400",
    check: "bg-amber-500",
  },
};

export function StepMethods({
  valuation,
  onSave,
  onNext,
}: StepProps) {
  const existing = valuation.methods;
  const [selected, setSelected] = useState<Set<string>>(() => {
    if (existing) {
      return new Set(
        Object.entries(existing)
          .filter(([, v]) => (v as { enabled?: boolean })?.enabled)
          .map(([k]) => k),
      );
    }
    return new Set(["dcf", "trading-multiples"]);
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (selected.size === 0) {
      toast.error("Select at least one valuation method.");
      return;
    }

    const methods: Record<string, { enabled: boolean; weight: number }> = {};
    const weight = +(1 / selected.size).toFixed(4);
    for (const id of selected) {
      methods[id] = { enabled: true, weight };
    }

    const result = await onSave(5, methods, true);
    if (result) toast.success("Methods saved!");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Calculator className="h-5 w-5 text-violet-400" />
          Valuation Methods
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Select which valuation methodologies to apply. AI will run each
          selected method and produce a weighted average.
        </p>
      </div>

      {/* Method Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {METHODOLOGIES.map((m) => {
          const isSelected = selected.has(m.id);
          const colors = colorMap[m.color];

          return (
            <button
              key={m.id}
              onClick={() => toggle(m.id)}
              className={`relative text-left rounded-xl border p-5 transition-all ${
                isSelected
                  ? `${colors.border} ${colors.bg}`
                  : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
              }`}
            >
              {/* Check indicator */}
              <div
                className={`absolute top-4 right-4 h-5 w-5 rounded-full flex items-center justify-center transition-all ${
                  isSelected
                    ? `${colors.check} text-white`
                    : "bg-slate-800 text-transparent"
                }`}
              >
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${colors.bg}`}
                >
                  <m.icon className={`h-4.5 w-4.5 ${colors.text}`} />
                </div>
                <h3 className="text-sm font-semibold text-white pr-6">
                  {m.name}
                </h3>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                {m.description}
              </p>

              <div className="flex items-center gap-4 text-[11px]">
                <span className="text-slate-500">
                  <span className="font-medium text-slate-400">Best for:</span>{" "}
                  {m.bestFor}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Weight Preview */}
      {selected.size > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Weight Distribution (Equal Weighted)
          </h4>
          <div className="flex flex-wrap gap-2">
            {[...selected].map((id) => {
              const m = METHODOLOGIES.find((m) => m.id === id);
              if (!m) return null;
              const colors = colorMap[m.color];
              return (
                <div
                  key={id}
                  className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${colors.bg} ${colors.text}`}
                >
                  {m.name}
                  <span className="opacity-60">
                    {((1 / selected.size) * 100).toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleSave}
          disabled={selected.size === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-40"
        >
          <Save className="h-3.5 w-3.5" />
          Save Selection
        </button>
        <button
          onClick={() => {
            handleSave().then(() => onNext());
          }}
          disabled={selected.size === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 transition-colors disabled:opacity-40"
        >
          Run Valuation
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
