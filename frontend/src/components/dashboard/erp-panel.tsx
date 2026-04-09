"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BotMessageSquare,
  Download,
  Globe,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import {
  fetchERPData,
  streamErpAnalysis,
  type ERPCountry,
  type ErpAgentStep,
  type ErpAnalysisResult,
} from "@/lib/erp-client";
import { ERPDataTable } from "./erp-data-table";
import { ERPDetailModal } from "./erp-detail-modal";
import { AgentInsightsPanel } from "./agent-insights-panel";
import { AssistantMessage } from "./chat-message";

export function ERPPanel() {
  const { accessToken } = useAuth();

  const [data, setData] = useState<ERPCountry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedCountry, setSelectedCountry] = useState<ERPCountry | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  /* AI Analysis State */
  const [analysisMode, setAnalysisMode] = useState(false);
  const [analysisContext, setAnalysisContext] = useState<"pe" | "vc" | "ma" | "general">("general");
  const [selectedForAnalysis, setSelectedForAnalysis] = useState<string[]>([]);
  const [erpQuestion, setErpQuestion] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [agentSteps, setAgentSteps] = useState<ErpAgentStep[]>([]);
  const [showInsights, setShowInsights] = useState(false);
  const [insightsComplete, setInsightsComplete] = useState(false);
  const [totalDuration, setTotalDuration] = useState<number | null>(null);
  const [analysisAnswer, setAnalysisAnswer] = useState<string | null>(null);
  const answerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchERPData(accessToken);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  /* Stats */
  const stats = useMemo(() => {
    if (!data.length) return null;
    const totalErps = data.map((d) => d.totalEquityRiskPremium);
    const countryErps = data.map((d) => d.countryRiskPremium);
    return {
      totalCountries: data.length,
      avgTotalERP: (totalErps.reduce((a, b) => a + b, 0) / totalErps.length).toFixed(2),
      avgCountryRP: (countryErps.reduce((a, b) => a + b, 0) / countryErps.length).toFixed(2),
      maxERP: Math.max(...totalErps).toFixed(2),
      minERP: Math.min(...totalErps).toFixed(2),
    };
  }, [data]);

  /* Export */
  const exportCsv = () => {
    const rows = [
      ["Country", "Continent", "Country Risk Premium (%)", "Total Equity Risk Premium (%)"],
      ...data.map((d) => [d.country, d.continent, d.countryRiskPremium, d.totalEquityRiskPremium]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "equity-risk-premium-data.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* Country selection for analysis */
  const toggleCountryForAnalysis = (name: string) => {
    setSelectedForAnalysis((prev) =>
      prev.includes(name)
        ? prev.filter((c) => c !== name)
        : prev.length < 10
          ? [...prev, name]
          : prev,
    );
  };

  /* Run AI Analysis */
  const runAnalysis = async () => {
    if (!accessToken || selectedForAnalysis.length === 0) return;
    setIsAnalyzing(true);
    setAgentSteps([]);
    setShowInsights(true);
    setInsightsComplete(false);
    setTotalDuration(null);
    setAnalysisAnswer(null);

    try {
      await streamErpAnalysis(
        accessToken,
        {
          countries: selectedForAnalysis,
          context: analysisContext,
          question: erpQuestion || undefined,
        },
        {
          onStep: (step) => {
            setAgentSteps((prev) => {
              const idx = prev.findIndex((s) => s.id === step.id);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], ...step };
                return updated;
              }
              return [...prev, step];
            });
          },
          onComplete: (result: ErpAnalysisResult) => {
            setAnalysisAnswer(result.answer);
            setTotalDuration(result.timing?.totalDuration ?? null);
            setInsightsComplete(true);
            setTimeout(() => {
              answerRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 200);
          },
          onError: (err) => {
            toast.error(err.message);
          },
        },
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ERP analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  /* ─── Render ─── */

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded bg-slate-200" />
          <div className="h-4 w-2/3 rounded bg-slate-200" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-slate-200" />
            ))}
          </div>
          <div className="h-96 rounded-xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (error && data.length === 0) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="mb-3 text-sm font-medium text-red-800">Error loading ERP data</p>
          <p className="mb-4 text-xs text-red-600">{error}</p>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-5 p-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Equity Risk Premium
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Country-specific risk premiums with AI-powered analysis for PE,
                VC & M&A advisors
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAnalysisMode((v) => !v)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  analysisMode
                    ? "bg-emerald-600 text-white"
                    : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                <Sparkles size={14} />
                AI Analysis
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                Refresh
              </button>
              <button
                onClick={exportCsv}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
              >
                <Download size={14} />
                Export
              </button>
            </div>
          </div>

          {/* AI Analysis Panel */}
          {analysisMode && (
            <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5">
              <div className="mb-3 flex items-center gap-2">
                <BotMessageSquare size={18} className="text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  ERP Analysis Agent — PE/VC/M&A Advisory
                </h3>
              </div>

              <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Advisory Context
                  </label>
                  <select
                    value={analysisContext}
                    onChange={(e) => setAnalysisContext(e.target.value as "pe" | "vc" | "ma" | "general")}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="pe">Private Equity</option>
                    <option value="vc">Venture Capital</option>
                    <option value="ma">M&A Advisory</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Selected Countries ({selectedForAnalysis.length}/10)
                  </label>
                  <div className="flex min-h-[36px] flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                    {selectedForAnalysis.length === 0 ? (
                      <span className="text-[11px] text-slate-400">
                        Check countries in the table below, or use quick add
                      </span>
                    ) : (
                      selectedForAnalysis.map((c) => (
                        <span
                          key={c}
                          className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                        >
                          {c}
                          <button
                            onClick={() => toggleCountryForAnalysis(c)}
                            className="text-emerald-400 hover:text-emerald-600"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-3 flex flex-wrap gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 self-center">
                  Quick Add:
                </span>
                {["United States", "United Kingdom", "Germany", "India", "Brazil", "China"].map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleCountryForAnalysis(c)}
                    className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      selectedForAnalysis.includes(c)
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <div className="mb-3">
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Question (optional)
                </label>
                <input
                  type="text"
                  value={erpQuestion}
                  onChange={(e) => setErpQuestion(e.target.value)}
                  placeholder="e.g. How does India's ERP affect a cross-border PE deal with a US fund?"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                onClick={runAnalysis}
                disabled={isAnalyzing || selectedForAnalysis.length === 0}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                {isAnalyzing
                  ? "Analyzing..."
                  : `Analyze ${selectedForAnalysis.length} Countr${selectedForAnalysis.length === 1 ? "y" : "ies"}`}
              </button>
            </div>
          )}

          {/* Analysis Answer */}
          {analysisAnswer && (
            <div ref={answerRef}>
              <AssistantMessage content={analysisAnswer} />
            </div>
          )}

          {/* Global Statistics */}
          {stats && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {[
                { label: "Total Countries", value: stats.totalCountries, gradient: "from-blue-50 to-blue-100", border: "border-blue-200", icon: Globe, iconColor: "text-blue-600", valColor: "text-blue-900" },
                { label: "Avg Total ERP", value: `${stats.avgTotalERP}%`, gradient: "from-emerald-50 to-emerald-100", border: "border-emerald-200", icon: TrendingUp, iconColor: "text-emerald-600", valColor: "text-emerald-900" },
                { label: "Avg Country RP", value: `${stats.avgCountryRP}%`, gradient: "from-teal-50 to-teal-100", border: "border-teal-200", icon: TrendingUp, iconColor: "text-teal-600", valColor: "text-teal-900" },
                { label: "Highest ERP", value: `${stats.maxERP}%`, gradient: "from-orange-50 to-orange-100", border: "border-orange-200", icon: TrendingUp, iconColor: "text-orange-600", valColor: "text-orange-900" },
                { label: "Lowest ERP", value: `${stats.minERP}%`, gradient: "from-violet-50 to-violet-100", border: "border-violet-200", icon: TrendingUp, iconColor: "text-violet-600", valColor: "text-violet-900" },
              ].map((s) => (
                <div
                  key={s.label}
                  className={`rounded-xl border bg-gradient-to-br p-4 ${s.gradient} ${s.border}`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <s.icon size={16} className={s.iconColor} />
                    <span className="text-[11px] font-medium text-slate-600">
                      {s.label}
                    </span>
                  </div>
                  <p className={`text-xl font-bold ${s.valColor}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Data Table */}
          <ERPDataTable
            data={data}
            onCountryClick={(c) => {
              setSelectedCountry(c);
              setModalOpen(true);
            }}
            onCountrySelect={analysisMode ? toggleCountryForAnalysis : undefined}
            selectedCountries={selectedForAnalysis}
          />
        </div>
      </div>

      {/* Right: Agent Insights Panel */}
      {showInsights && (
        <div className="hidden w-[370px] shrink-0 border-l border-slate-200/60 lg:block">
          <AgentInsightsPanel
            steps={agentSteps}
            isActive={isAnalyzing}
            isComplete={insightsComplete}
            totalDuration={totalDuration}
            onClose={() => setShowInsights(false)}
          />
        </div>
      )}

      {/* Detail Modal */}
      <ERPDetailModal
        country={selectedCountry}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedCountry(null);
        }}
      />
    </div>
  );
}
