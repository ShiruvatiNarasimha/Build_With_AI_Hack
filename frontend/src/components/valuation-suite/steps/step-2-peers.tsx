"use client";

import { useState } from "react";
import {
  ArrowRight,
  Building2,
  GitMerge,
  Loader2,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import {
  streamPeerFinder,
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

function fmt(num: number | null | undefined) {
  if (num == null || isNaN(num)) return "—";
  const abs = Math.abs(num);
  if (abs >= 1e12) return `$${(num / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  return `$${num.toLocaleString()}`;
}

function fmtMultiple(num: number | null | undefined) {
  if (num == null || isNaN(num)) return "—";
  return `${num.toFixed(1)}x`;
}

export function StepPeers({
  valuation,
  accessToken,
  onRefresh,
  onNext,
  onAgentStep,
  clearAgentSteps,
  isProcessing,
  setIsProcessing,
}: StepProps) {
  const peers = valuation.peers;
  const profile = valuation.companyProfile;
  const [topN, setTopN] = useState(25);

  const handleFindPeers = async () => {
    clearAgentSteps();
    setIsProcessing(true);

    try {
      await streamPeerFinder(
        accessToken,
        valuation.id,
        {
          industry: profile?.industry,
          sector: profile?.sector,
          country: profile?.country,
          keywords: profile?.keywords,
          topN,
        },
        {
          onStep: onAgentStep,
          onComplete: async () => {
            await onRefresh();
            toast.success("Peers and M&A deals found!");
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to find peers.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const companies = peers?.companies || [];
  const deals = peers?.deals || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-400" />
          Peer Companies &amp; M&amp;A Deals
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          AI finds comparable public companies and recent M&amp;A transactions
          based on your company profile.
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Max Results
          </label>
          <select
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value))}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
        <button
          onClick={handleFindPeers}
          disabled={isProcessing}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isProcessing ? "Finding Peers..." : "Find Comparable Peers with AI"}
        </button>
      </div>

      {/* Peer Companies Table */}
      {companies.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-blue-400" />
            Public Comparables ({companies.length})
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50">
                  <th className="px-4 py-3 text-xs font-medium text-slate-400">
                    Company
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400">
                    Ticker
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 text-right">
                    Market Cap
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 text-right">
                    EV/EBITDA
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 text-right">
                    EV/Revenue
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 text-right">
                    P/E
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 text-right">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c, i) => (
                  <tr
                    key={`${c.symbol}-${i}`}
                    className="border-b border-slate-800/50 hover:bg-slate-900/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">
                        {c.companyName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {c.industry}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-mono text-xs">
                      {c.symbol || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {fmt(c.marketCap)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {fmtMultiple(c.evEbitda)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {fmtMultiple(c.evRevenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {fmtMultiple(c.peRatio)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-400">
                        {((c.similarityScore || 0) * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* M&A Deals Table */}
      {deals.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
            <GitMerge className="h-4 w-4 text-emerald-400" />
            Comparable M&amp;A Transactions ({deals.length})
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50">
                  <th className="px-4 py-3 text-xs font-medium text-slate-400">
                    Target
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400">
                    Acquirer
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 text-right">
                    Deal Value
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 text-right">
                    EV/Revenue
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 text-right">
                    EV/EBITDA
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400">
                    Date
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-400 text-right">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {deals.map((d, i) => (
                  <tr
                    key={`${d.target}-${i}`}
                    className="border-b border-slate-800/50 hover:bg-slate-900/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{d.target}</div>
                      <div className="text-[11px] text-slate-500">
                        {d.industry}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{d.acquirer}</td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {d.dealValue ? `$${d.dealValue}M` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {fmtMultiple(d.evRevenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {fmtMultiple(d.evEbitda)}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {d.dealDate || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                        {((d.similarityScore || 0) * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Continue */}
      {(companies.length > 0 || deals.length > 0) && (
        <div className="flex justify-end">
          <button
            onClick={onNext}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
          >
            Continue to Financials
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
