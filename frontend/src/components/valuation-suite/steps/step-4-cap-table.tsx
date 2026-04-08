"use client";

import { useCallback, useState } from "react";
import {
  ArrowRight,
  PieChart,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import type { AgentStep, CapTableData, Valuation } from "@/lib/valuation-suite-client";

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

const defaultShareClass = () => ({
  id: crypto.randomUUID(),
  name: "",
  type: "Common",
  shares: 0,
  pricePerShare: 0,
  liquidationPreference: 1,
  votingRights: true,
  participatingPreferred: false,
});

const defaultDebt = () => ({
  id: crypto.randomUUID(),
  name: "",
  type: "Term Loan",
  principal: 0,
  interestRate: 0,
  maturityDate: "",
  convertible: false,
  conversionPrice: 0,
});

export function StepCapTable({
  valuation,
  onSave,
  onNext,
}: StepProps) {
  const existing = valuation.capTable;

  const [shareClasses, setShareClasses] = useState(
    existing?.shareClasses?.length
      ? existing.shareClasses
      : [defaultShareClass()],
  );
  const [debtInstruments, setDebtInstruments] = useState(
    existing?.debtInstruments?.length
      ? existing.debtInstruments
      : [],
  );

  const updateShare = useCallback(
    (id: string, field: string, value: unknown) => {
      setShareClasses((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
      );
    },
    [],
  );

  const updateDebt = useCallback(
    (id: string, field: string, value: unknown) => {
      setDebtInstruments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)),
      );
    },
    [],
  );

  const totalShares = shareClasses.reduce((sum, s) => sum + (s.shares || 0), 0);
  const totalEquity = shareClasses.reduce(
    (sum, s) => sum + (s.shares || 0) * (s.pricePerShare || 0),
    0,
  );
  const totalDebt = debtInstruments.reduce(
    (sum, d) => sum + (d.principal || 0),
    0,
  );

  const handleSave = async () => {
    const data: CapTableData = {
      shareClasses,
      debtInstruments,
      totalShares,
      totalDebt,
    };

    const result = await onSave(4, data as unknown as Record<string, unknown>, true);
    if (result) toast.success("Cap table saved!");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <PieChart className="h-5 w-5 text-amber-400" />
          Cap Table
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Define the capitalization structure — share classes and debt
          instruments.
        </p>
      </div>

      {/* Share Classes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Share Classes</h3>
          <button
            onClick={() =>
              setShareClasses((prev) => [...prev, defaultShareClass()])
            }
            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
          >
            <Plus className="h-3 w-3" /> Add Class
          </button>
        </div>

        <div className="space-y-3">
          {shareClasses.map((sc) => (
            <div
              key={sc.id}
              className="grid grid-cols-2 sm:grid-cols-5 gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4"
            >
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] text-slate-500 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={sc.name}
                  onChange={(e) => updateShare(sc.id, "name", e.target.value)}
                  placeholder="Series A"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">
                  Type
                </label>
                <select
                  value={sc.type}
                  onChange={(e) => updateShare(sc.id, "type", e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                >
                  <option>Common</option>
                  <option>Preferred</option>
                  <option>Restricted</option>
                  <option>Options</option>
                  <option>Warrants</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">
                  Shares
                </label>
                <input
                  type="number"
                  value={sc.shares || ""}
                  onChange={(e) =>
                    updateShare(sc.id, "shares", Number(e.target.value))
                  }
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">
                  Price/Share ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={sc.pricePerShare || ""}
                  onChange={(e) =>
                    updateShare(sc.id, "pricePerShare", Number(e.target.value))
                  }
                  placeholder="0.00"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none font-mono"
                />
              </div>
              {shareClasses.length > 1 && (
                <div className="flex items-end">
                  <button
                    onClick={() =>
                      setShareClasses((prev) =>
                        prev.filter((s) => s.id !== sc.id),
                      )
                    }
                    className="rounded-lg p-2 text-slate-600 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Debt Instruments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">
            Debt Instruments
          </h3>
          <button
            onClick={() =>
              setDebtInstruments((prev) => [...prev, defaultDebt()])
            }
            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
          >
            <Plus className="h-3 w-3" /> Add Debt
          </button>
        </div>

        {debtInstruments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/20 p-8 text-center">
            <p className="text-sm text-slate-500">
              No debt instruments. Click &quot;Add Debt&quot; to add one, or skip
              to continue.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {debtInstruments.map((d) => (
              <div
                key={d.id}
                className="grid grid-cols-2 sm:grid-cols-5 gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4"
              >
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={d.name}
                    onChange={(e) => updateDebt(d.id, "name", e.target.value)}
                    placeholder="Senior Loan"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">
                    Type
                  </label>
                  <select
                    value={d.type}
                    onChange={(e) => updateDebt(d.id, "type", e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                  >
                    <option>Term Loan</option>
                    <option>Revolving Credit</option>
                    <option>Convertible Note</option>
                    <option>Mezzanine</option>
                    <option>Bond</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">
                    Principal ($)
                  </label>
                  <input
                    type="number"
                    value={d.principal || ""}
                    onChange={(e) =>
                      updateDebt(d.id, "principal", Number(e.target.value))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-white font-mono focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">
                    Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={d.interestRate || ""}
                    onChange={(e) =>
                      updateDebt(d.id, "interestRate", Number(e.target.value))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-white font-mono focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() =>
                      setDebtInstruments((prev) =>
                        prev.filter((i) => i.id !== d.id),
                      )
                    }
                    className="rounded-lg p-2 text-slate-600 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
            Total Shares
          </p>
          <p className="text-lg font-bold text-white font-mono">
            {totalShares.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
            Total Equity Value
          </p>
          <p className="text-lg font-bold text-emerald-400 font-mono">
            ${totalEquity.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
            Total Debt
          </p>
          <p className="text-lg font-bold text-amber-400 font-mono">
            ${totalDebt.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <Save className="h-3.5 w-3.5" />
          Save Cap Table
        </button>
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
        >
          Continue to Methods
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
