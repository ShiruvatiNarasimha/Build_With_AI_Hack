"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  ArrowRightLeft,
  ArrowUpDown,
  BotMessageSquare,
  DollarSign,
  Download,
  Filter,
  Globe,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import {
  fetchForexPairs,
  streamFxAnalysis,
  type ForexPair,
  type FxAgentStep,
  type FxAnalysisResult,
} from "@/lib/forex-client";
import { ForexDataTable } from "./forex-data-table";
import { ForexChartModal } from "./forex-chart-modal";
import { AgentInsightsPanel } from "./agent-insights-panel";
import { AssistantMessage } from "./chat-message";

const MAJOR_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD"];
const CRYPTO_CURRENCIES = ["BTC", "ETH", "XRP", "LTC", "BCH", "ADA", "DOT", "BNB"];
const COMMODITY_CURRENCIES = ["XAU", "XAG", "XPT", "XPD"];

export function ForexPanel() {
  const { accessToken } = useAuth();

  const [pairs, setPairs] = useState<ForexPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("all");
  const [quoteCurrency, setQuoteCurrency] = useState("all");

  const [selectedPair, setSelectedPair] = useState<ForexPair | null>(null);
  const [chartOpen, setChartOpen] = useState(false);

  /* AI Analysis State */
  const [analysisMode, setAnalysisMode] = useState(false);
  const [analysisContext, setAnalysisContext] = useState<
    "pe" | "vc" | "ma" | "general"
  >("general");
  const [selectedForAnalysis, setSelectedForAnalysis] = useState<string[]>([]);
  const [fxQuestion, setFxQuestion] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [agentSteps, setAgentSteps] = useState<FxAgentStep[]>([]);
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
      const data = await fetchForexPairs(accessToken);
      setPairs(data);
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

  /* Filtering */
  const filtered = useMemo(() => {
    if (!pairs.length) return [];
    const q = search.toLowerCase();
    return pairs.filter((p) => {
      const matchesSearch =
        !q ||
        p.symbol.toLowerCase().includes(q) ||
        p.fromName.toLowerCase().includes(q) ||
        p.toName.toLowerCase().includes(q) ||
        p.fromCurrency.toLowerCase().includes(q) ||
        p.toCurrency.toLowerCase().includes(q);
      const matchesBase =
        baseCurrency === "all" || p.fromCurrency === baseCurrency;
      const matchesQuote =
        quoteCurrency === "all" || p.toCurrency === quoteCurrency;
      return matchesSearch && matchesBase && matchesQuote;
    });
  }, [pairs, search, baseCurrency, quoteCurrency]);

  const baseCurrencies = useMemo(
    () => [...new Set(pairs.map((p) => p.fromCurrency))].filter(Boolean).sort(),
    [pairs],
  );
  const quoteCurrencies = useMemo(
    () => [...new Set(pairs.map((p) => p.toCurrency))].filter(Boolean).sort(),
    [pairs],
  );

  /* Overview Stats */
  const stats = useMemo(() => {
    if (!pairs.length) return null;
    const majors = pairs.filter(
      (p) =>
        MAJOR_CURRENCIES.includes(p.fromCurrency) &&
        MAJOR_CURRENCIES.includes(p.toCurrency),
    ).length;
    const crypto = pairs.filter(
      (p) =>
        CRYPTO_CURRENCIES.includes(p.fromCurrency) ||
        CRYPTO_CURRENCIES.includes(p.toCurrency),
    ).length;
    const commodities = pairs.filter(
      (p) =>
        COMMODITY_CURRENCIES.includes(p.fromCurrency) ||
        COMMODITY_CURRENCIES.includes(p.toCurrency),
    ).length;
    return {
      total: pairs.length,
      majors,
      crypto,
      baseCurrencyCount: baseCurrencies.length,
      commodities,
    };
  }, [pairs, baseCurrencies]);

  /* Export */
  const exportCsv = () => {
    const rows = [
      ["Symbol", "From Currency", "To Currency", "From Name", "To Name"],
      ...filtered.map((p) => [
        p.symbol,
        p.fromCurrency,
        p.toCurrency,
        p.fromName,
        p.toName,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "forex-pairs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* Chart */
  const handlePairSelect = (pair: ForexPair) => {
    setSelectedPair(pair);
    setChartOpen(true);
  };

  /* AI Analysis */
  const togglePairForAnalysis = (symbol: string) => {
    setSelectedForAnalysis((prev) =>
      prev.includes(symbol)
        ? prev.filter((s) => s !== symbol)
        : prev.length < 5
          ? [...prev, symbol]
          : prev,
    );
  };

  const runAnalysis = async () => {
    if (!accessToken || selectedForAnalysis.length === 0) return;
    setIsAnalyzing(true);
    setAgentSteps([]);
    setShowInsights(true);
    setInsightsComplete(false);
    setTotalDuration(null);
    setAnalysisAnswer(null);

    try {
      await streamFxAnalysis(
        accessToken,
        {
          pairs: selectedForAnalysis,
          context: analysisContext,
          question: fxQuestion || undefined,
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
          onComplete: (result: FxAnalysisResult) => {
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
      toast.error(
        err instanceof Error ? err.message : "FX analysis failed.",
      );
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
              <div key={i} className="h-28 rounded-xl bg-slate-200" />
            ))}
          </div>
          <div className="h-96 rounded-xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (error && pairs.length === 0) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="mb-3 text-sm font-medium text-red-800">
            Error loading forex data
          </p>
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
      {/* Main content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-5 p-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Foreign Exchange Market
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Real-time currency pairs with AI-powered analysis for PE, VC &
                M&A advisors
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAnalysisMode((v) => !v)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  analysisMode
                    ? "bg-violet-600 text-white"
                    : "border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
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
                <RefreshCw
                  size={14}
                  className={refreshing ? "animate-spin" : ""}
                />
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
            <div className="rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-blue-50 p-5">
              <div className="mb-3 flex items-center gap-2">
                <BotMessageSquare size={18} className="text-violet-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  FX Analysis Agent — PE/VC/M&A Advisory
                </h3>
              </div>

              <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Advisory Context
                  </label>
                  <select
                    value={analysisContext}
                    onChange={(e) =>
                      setAnalysisContext(
                        e.target.value as "pe" | "vc" | "ma" | "general",
                      )
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
                  >
                    <option value="pe">Private Equity</option>
                    <option value="vc">Venture Capital</option>
                    <option value="ma">M&A Advisory</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Selected Pairs ({selectedForAnalysis.length}/5)
                  </label>
                  <div className="flex min-h-[36px] flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                    {selectedForAnalysis.length === 0 ? (
                      <span className="text-[11px] text-slate-400">
                        Click pairs below to select (or type manually)
                      </span>
                    ) : (
                      selectedForAnalysis.map((s) => (
                        <span
                          key={s}
                          className="flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700"
                        >
                          {s}
                          <button
                            onClick={() => togglePairForAnalysis(s)}
                            className="text-violet-400 hover:text-violet-600"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Quick Add
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {["EURUSD", "GBPUSD", "USDJPY", "USDCHF"].map((p) => (
                      <button
                        key={p}
                        onClick={() => togglePairForAnalysis(p)}
                        className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                          selectedForAnalysis.includes(p)
                            ? "bg-violet-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Question (optional)
                </label>
                <input
                  type="text"
                  value={fxQuestion}
                  onChange={(e) => setFxQuestion(e.target.value)}
                  placeholder="e.g. What's the FX risk for a EUR-denominated LBO with GBP target?"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <button
                onClick={runAnalysis}
                disabled={
                  isAnalyzing || selectedForAnalysis.length === 0
                }
                className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                {isAnalyzing
                  ? "Analyzing..."
                  : `Analyze ${selectedForAnalysis.length} Pair(s)`}
              </button>
            </div>
          )}

          {/* Analysis Answer */}
          {analysisAnswer && (
            <div ref={answerRef}>
              <AssistantMessage content={analysisAnswer} />
            </div>
          )}

          {/* Overview Statistics */}
          {stats && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {[
                {
                  label: "Total Pairs",
                  value: stats.total,
                  icon: ArrowUpDown,
                  bg: "bg-blue-100",
                  iconColor: "text-blue-600",
                },
                {
                  label: "Major Pairs",
                  value: stats.majors,
                  icon: DollarSign,
                  bg: "bg-emerald-100",
                  iconColor: "text-emerald-600",
                },
                {
                  label: "Crypto Pairs",
                  value: stats.crypto,
                  icon: Activity,
                  bg: "bg-orange-100",
                  iconColor: "text-orange-600",
                },
                {
                  label: "Commodities",
                  value: stats.commodities,
                  icon: ArrowRightLeft,
                  bg: "bg-amber-100",
                  iconColor: "text-amber-600",
                },
                {
                  label: "Base Currencies",
                  value: stats.baseCurrencyCount,
                  icon: Globe,
                  bg: "bg-violet-100",
                  iconColor: "text-violet-600",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div>
                    <p className="text-[11px] font-medium text-slate-500">
                      {s.label}
                    </p>
                    <p className="mt-0.5 text-xl font-bold text-slate-900">
                      {s.value}
                    </p>
                  </div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.bg}`}
                  >
                    <s.icon size={20} className={s.iconColor} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search currency pairs..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-56"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-slate-400" />
                  <select
                    value={baseCurrency}
                    onChange={(e) => setBaseCurrency(e.target.value)}
                    className="rounded-lg border border-slate-200 px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">All Base</option>
                    {baseCurrencies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <select
                    value={quoteCurrency}
                    onChange={(e) => setQuoteCurrency(e.target.value)}
                    className="rounded-lg border border-slate-200 px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">All Quote</option>
                    {quoteCurrencies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Showing {filtered.length} of {pairs.length} pairs
              </p>
            </div>
          </div>

          {/* Data Table */}
          <ForexDataTable
            data={filtered}
            onPairSelect={handlePairSelect}
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

      {/* Chart Modal */}
      {selectedPair && (
        <ForexChartModal
          isOpen={chartOpen}
          onClose={() => {
            setChartOpen(false);
            setSelectedPair(null);
          }}
          pair={selectedPair}
        />
      )}
    </div>
  );
}
