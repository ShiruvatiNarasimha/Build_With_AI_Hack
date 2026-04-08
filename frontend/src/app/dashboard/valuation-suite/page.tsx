"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeDollarSign,
  BarChart3,
  Building2,
  Clock,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import {
  createValuation,
  deleteValuation as deleteVal,
  listValuations,
  type Valuation,
} from "@/lib/valuation-suite-client";

const STEP_LABELS = [
  "Company Profile",
  "Peers",
  "Financials",
  "Cap Table",
  "Methods",
  "Valuation",
  "Results",
];

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI Company Profiler",
    desc: "Auto-generate comprehensive company profiles from just a name and website.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: Building2,
    title: "Peer Intelligence",
    desc: "AI finds comparable public companies and M&A transactions instantly.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: TrendingUp,
    title: "Financial Modeling",
    desc: "Auto-pull 10yr financials via FMP and generate AI-powered projections.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: BarChart3,
    title: "Multi-Method Valuation",
    desc: "DCF, Trading Multiples, M&A Comps, and Startup methods with AI analysis.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
];

export default function ValuationSuiteHub() {
  const { accessToken, status } = useAuth();
  const router = useRouter();
  const [valuations, setValuations] = useState<Valuation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchValuations = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await listValuations(accessToken);
      setValuations(data);
    } catch {
      toast.error("Failed to load valuations.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (status === "authenticated") fetchValuations();
    else if (status === "unauthenticated") setLoading(false);
  }, [status, fetchValuations]);

  const handleNew = async () => {
    if (!accessToken) {
      toast.error("Please sign in first.");
      return;
    }
    setCreating(true);
    try {
      const val = await createValuation(accessToken);
      router.push(`/dashboard/valuation-suite/${val.id}`);
    } catch {
      toast.error("Failed to create valuation.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    try {
      await deleteVal(accessToken, id);
      setValuations((prev) => prev.filter((v) => v.id !== id));
      toast.success("Valuation deleted.");
    } catch {
      toast.error("Failed to delete.");
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const getProgress = (v: Valuation) =>
    Math.round((v.completedSteps.length / 7) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-600">
              <BadgeDollarSign className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Valuation Suite
            </h1>
          </div>
          <p className="text-slate-400 text-base mt-1">
            AI-powered 7-step valuation workflow for PE, VC &amp; M&amp;A
            advisors. Start a new valuation or continue where you left off.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm"
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${f.bg} mb-3`}
              >
                <f.icon className={`h-4.5 w-4.5 ${f.color}`} />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">
                {f.title}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* New Valuation Button */}
        <div className="mb-8">
          <button
            onClick={handleNew}
            disabled={creating || status !== "authenticated"}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:shadow-violet-500/30 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Start New Valuation
          </button>
        </div>

        {/* Past Valuations */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">
            Your Valuations
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            </div>
          ) : valuations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 p-12 text-center">
              <FileText className="mx-auto h-10 w-10 text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm">
                No valuations yet. Start your first one above.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {valuations.map((v) => {
                const profile = v.companyProfile;
                const progress = getProgress(v);
                return (
                  <div
                    key={v.id}
                    className="group flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-all hover:border-slate-700 hover:bg-slate-900/80 cursor-pointer"
                    onClick={() =>
                      router.push(`/dashboard/valuation-suite/${v.id}`)
                    }
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-800">
                      <Building2 className="h-5 w-5 text-slate-400" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-white truncate">
                          {v.name}
                        </h3>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            v.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : v.status === "IN_PROGRESS"
                                ? "bg-blue-500/10 text-blue-400"
                                : "bg-slate-700 text-slate-400"
                          }`}
                        >
                          {v.status === "COMPLETED"
                            ? "Completed"
                            : v.status === "IN_PROGRESS"
                              ? `Step ${v.currentStep}/7`
                              : "Draft"}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                        {profile?.industry && (
                          <span>{profile.industry}</span>
                        )}
                        {profile?.country && <span>{profile.country}</span>}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(v.updatedAt)}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 tabular-nums">
                          {progress}%
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(v.id);
                      }}
                      className="shrink-0 rounded-lg p-2 text-slate-600 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Step Legend */}
        <div className="mt-10 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">
            7-Step Valuation Workflow
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {STEP_LABELS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-400">
                  {i + 1}
                </div>
                <span className="text-xs text-slate-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
