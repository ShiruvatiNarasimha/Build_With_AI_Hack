"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowRightLeft,
  BarChart3,
  Calendar,
  Download,
  Info,
  Loader2,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAuth } from "@/hooks/use-auth";
import {
  fetchForexHistorical,
  type ForexHistoricalPoint,
  type ForexPair,
} from "@/lib/forex-client";

const CURRENCY_TO_COUNTRY: Record<string, string> = {
  USD: "us", EUR: "eu", GBP: "gb", JPY: "jp", CHF: "ch", CAD: "ca",
  AUD: "au", NZD: "nz", SGD: "sg", HKD: "hk", CNY: "cn", INR: "in",
  BRL: "br", MXN: "mx", ZAR: "za", TRY: "tr", KRW: "kr",
};

function CurrencyFlag({ code }: { code: string }) {
  const country = CURRENCY_TO_COUNTRY[code];
  if (!country) {
    return (
      <div className="flex h-6 w-8 items-center justify-center rounded-sm bg-slate-200 text-[10px] text-slate-500">
        {code}
      </div>
    );
  }
  return (
    <Image
      src={`https://flagcdn.com/w40/${country}.png`}
      alt={code}
      width={32}
      height={24}
      className="h-6 w-8 rounded-sm object-cover"
    />
  );
}

const TIMEFRAMES = [
  { label: "1M", months: 1 },
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
  { label: "2Y", months: 24 },
  { label: "5Y", months: 60 },
] as const;

interface ChartPoint extends ForexHistoricalPoint {
  displayDate: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pair: ForexPair;
}

export function ForexChartModal({ isOpen, onClose, pair }: Props) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState("1Y");
  const [chartType, setChartType] = useState<"line" | "area">("area");
  const [customRange, setCustomRange] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);

    let from: string;
    let to: string;

    if (customRange && fromDate && toDate) {
      from = fromDate;
      to = toDate;
    } else {
      to = new Date().toISOString().split("T")[0];
      const d = new Date();
      const tf = TIMEFRAMES.find((t) => t.label === timeframe) ?? TIMEFRAMES[3];
      d.setMonth(d.getMonth() - tf.months);
      from = d.toISOString().split("T")[0];
    }

    try {
      const raw = await fetchForexHistorical(
        accessToken,
        pair.symbol,
        from,
        to,
      );

      const formatted: ChartPoint[] = raw
        .sort(
          (a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime(),
        )
        .map((p) => ({
          ...p,
          displayDate: new Date(p.date).toLocaleDateString(),
          vwap: p.vwap || p.close,
          change: p.change || 0,
          changePercent: p.changePercent || 0,
          volume: p.volume || 0,
        }));

      setData(formatted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, pair.symbol, timeframe, customRange, fromDate, toDate]);

  useEffect(() => {
    if (isOpen && pair) load();
  }, [isOpen, pair, load]);

  const stats = useMemo(() => {
    if (!data.length) return null;

    const prices = data.map((d) => d.close);
    const latest = prices[prices.length - 1];
    const previous = prices.length > 1 ? prices[prices.length - 2] : latest;
    const change = latest - previous;
    const pct = (change / previous) * 100;
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const vols = data.map((d) => d.volume);
    const avgVol = vols.reduce((a, b) => a + b, 0) / vols.length;
    const lastVwap = data[data.length - 1]?.vwap ?? latest;
    const lastChange = data[data.length - 1]?.change ?? 0;
    const lastPct = data[data.length - 1]?.changePercent ?? 0;

    return {
      latest: latest.toFixed(4),
      change: change.toFixed(4),
      changePct: pct.toFixed(2),
      high: high.toFixed(4),
      low: low.toFixed(4),
      range: (high - low).toFixed(4),
      avgVol: Math.round(avgVol).toLocaleString(),
      vwap: lastVwap.toFixed(4),
      lastChange: lastChange.toFixed(4),
      lastPct: lastPct.toFixed(2),
    };
  }, [data]);

  const exportCsv = () => {
    if (!data.length) return;
    const rows = [
      ["Date", "Open", "High", "Low", "Close", "Volume", "Change", "Change%", "VWAP"],
      ...data.map((d) => [
        d.date, d.open, d.high, d.low, d.close, d.volume, d.change, d.changePercent, d.vwap,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pair.symbol}-${customRange ? "custom" : timeframe}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: ChartPoint }>;
  }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg">
        <p className="mb-1.5 font-semibold text-slate-800">{d.displayDate}</p>
        <div className="space-y-0.5">
          <Row label="Open" value={d.open?.toFixed(4)} />
          <Row label="High" value={d.high?.toFixed(4)} color="text-emerald-600" />
          <Row label="Low" value={d.low?.toFixed(4)} color="text-red-500" />
          <Row label="Close" value={d.close?.toFixed(4)} color="text-blue-600" />
          <Row label="VWAP" value={d.vwap?.toFixed(4)} color="text-violet-600" />
          <Row label="Vol" value={d.volume?.toLocaleString() || "N/A"} />
          <Row
            label="Change"
            value={`${d.change >= 0 ? "+" : ""}${d.change?.toFixed(4)} (${d.changePercent?.toFixed(2)}%)`}
            color={d.change >= 0 ? "text-emerald-600" : "text-red-500"}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <CurrencyFlag code={pair.fromCurrency} />
              <ArrowRightLeft size={14} className="text-slate-400" />
              <CurrencyFlag code={pair.toCurrency} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{pair.symbol}</h2>
              <p className="text-xs text-slate-500">
                {pair.fromName} → {pair.toName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Controls */}
        <div className="border-b border-slate-100 px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.label}
                  onClick={() => {
                    setTimeframe(tf.label);
                    setCustomRange(false);
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    timeframe === tf.label && !customRange
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tf.label}
                </button>
              ))}
              <button
                onClick={() => setCustomRange((v) => !v)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  customRange
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Calendar size={12} />
                Custom
              </button>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={chartType}
                onChange={(e) =>
                  setChartType(e.target.value as "line" | "area")
                }
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="area">Area Chart</option>
                <option value="line">Line Chart</option>
              </select>
              <button
                onClick={exportCsv}
                disabled={!data.length}
                className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                <Download size={12} />
                Export
              </button>
            </div>
          </div>

          {customRange && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                From
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  max={toDate || new Date().toISOString().split("T")[0]}
                  className="rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                To
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  min={fromDate}
                  max={new Date().toISOString().split("T")[0]}
                  className="rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </label>
              <button
                onClick={load}
                disabled={!fromDate || !toDate || loading}
                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-3 border-b border-slate-100 px-6 py-3 md:grid-cols-8">
            {[
              { label: "Latest", value: stats.latest },
              {
                label: "Change",
                value: `${parseFloat(stats.lastChange) >= 0 ? "+" : ""}${stats.lastChange}`,
                color:
                  parseFloat(stats.lastChange) >= 0
                    ? "text-emerald-600"
                    : "text-red-500",
              },
              {
                label: "Change %",
                value: `${parseFloat(stats.lastPct) >= 0 ? "+" : ""}${stats.lastPct}%`,
                color:
                  parseFloat(stats.lastPct) >= 0
                    ? "text-emerald-600"
                    : "text-red-500",
              },
              { label: "VWAP", value: stats.vwap, color: "text-blue-600" },
              { label: "High", value: stats.high },
              { label: "Low", value: stats.low },
              { label: "Range", value: stats.range },
              { label: "Avg Vol", value: stats.avgVol, color: "text-violet-600" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {s.label}
                </p>
                <p
                  className={`mt-0.5 text-sm font-semibold ${s.color ?? "text-slate-800"}`}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        <div className="flex-1 p-6">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Loader2 className="mx-auto mb-3 animate-spin text-blue-500" size={28} />
                <p className="text-xs text-slate-500">Loading historical data…</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Info className="mx-auto mb-3 text-red-400" size={28} />
                <p className="mb-3 text-sm text-red-600">{error}</p>
                <button
                  onClick={load}
                  className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : !data.length ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <BarChart3 className="mx-auto mb-3 text-slate-300" size={28} />
                <p className="text-xs text-slate-500">No historical data available</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "area" ? (
                <AreaChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#94a3b8"
                    fontSize={11}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    domain={["dataMin - 0.005", "dataMax + 0.005"]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.08}
                    strokeWidth={2}
                    name="Close"
                  />
                  <Area
                    type="monotone"
                    dataKey="vwap"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.03}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    name="VWAP"
                  />
                </AreaChart>
              ) : (
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#94a3b8"
                    fontSize={11}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    domain={["dataMin - 0.005", "dataMax + 0.005"]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={2} dot={false} name="Close" />
                  <Line type="monotone" dataKey="vwap" stroke="#8b5cf6" strokeWidth={1.5} dot={false} name="VWAP" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="high" stroke="#10b981" strokeWidth={1} dot={false} name="High" strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="low" stroke="#ef4444" strokeWidth={1} dot={false} name="Low" strokeDasharray="5 5" />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  color,
}: {
  label: string;
  value?: string;
  color?: string;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{label}:</span>
      <span className={`font-medium ${color ?? "text-slate-800"}`}>
        {value ?? "N/A"}
      </span>
    </div>
  );
}
