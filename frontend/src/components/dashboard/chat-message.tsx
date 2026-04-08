"use client";

import { type ReactNode, useMemo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  BotMessageSquare,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  TrendingUp,
} from "lucide-react";

/* ─── Constants ─── */

const PALETTE = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

/* ─── Number helpers ─── */

function parseNumeric(raw: string): number | null {
  const s = raw.replace(/[,$~≈\s]/g, "").trim();
  const m = s.match(/^[-+]?\$?([\d.]+)\s*([TBMK])?%?$/i);
  if (!m) return null;
  let v = parseFloat(m[1]);
  if (isNaN(v)) return null;
  switch (m[2]?.toUpperCase()) {
    case "T": v *= 1e12; break;
    case "B": v *= 1e9; break;
    case "M": v *= 1e6; break;
    case "K": v *= 1e3; break;
  }
  return v;
}

function smartFmt(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e12) return `${(v / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v % 1 === 0 ? String(v) : v.toFixed(2);
}

/* ─── Table parsing ─── */

interface ParsedTable {
  headers: string[];
  rows: string[][];
}

type Segment =
  | { kind: "md"; text: string }
  | { kind: "tableGroup"; tables: ParsedTable[] };

function isSepLine(line: string): boolean {
  const cells = line.split("|").filter(Boolean);
  return cells.length > 0 && cells.every((c) => /^[\s\-:]+$/.test(c));
}

function parseTableBlock(block: string): ParsedTable {
  const lines = block.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  const split = (l: string) => l.split("|").map((c) => c.trim()).filter(Boolean);
  const headers = split(lines[0]);
  const rows = lines.slice(1).filter((l) => !isSepLine(l)).map(split);
  return { headers, rows };
}

function parseContent(md: string): Segment[] {
  const tableRe = /(?:^[ \t]*\|.+\|[ \t]*$\n?){3,}/gm;
  const segments: Segment[] = [];
  let lastIdx = 0;

  for (const match of md.matchAll(tableRe)) {
    const gap = md.slice(lastIdx, match.index);
    lastIdx = match.index! + match[0].length;
    const table = parseTableBlock(match[0]);

    if (gap.trim()) {
      segments.push({ kind: "md", text: gap });
      segments.push({ kind: "tableGroup", tables: [table] });
    } else {
      const last = segments[segments.length - 1];
      if (last?.kind === "tableGroup") {
        last.tables.push(table);
      } else {
        segments.push({ kind: "tableGroup", tables: [table] });
      }
    }
  }

  const tail = md.slice(lastIdx);
  if (tail.trim()) segments.push({ kind: "md", text: tail });
  return segments;
}

/* ─── Chart data builders ─── */

interface ChartInfo {
  type: "line" | "bar" | "pie";
  data: Record<string, unknown>[];
  series: string[];
}

function buildChart(table: ParsedTable): ChartInfo | null {
  /* 1 ── time-series: headers contain year numbers (2020, 2021 …) */
  const yearCols: number[] = [];
  for (let c = 1; c < table.headers.length; c++) {
    if (/^\d{4}$/.test(table.headers[c].trim())) yearCols.push(c);
  }
  if (yearCols.length >= 2) {
    const buckets: Record<string, Record<string, number>> = {};
    for (const c of yearCols) buckets[table.headers[c]] = {};
    const series: string[] = [];

    for (const row of table.rows) {
      const metric = row[0]?.trim();
      if (!metric) continue;
      const vals = yearCols.map((c) => parseNumeric(row[c] ?? ""));
      if (vals.every((v) => v === null)) continue;
      series.push(metric);
      for (let i = 0; i < yearCols.length; i++) {
        buckets[table.headers[yearCols[i]]][metric] = vals[i] ?? 0;
      }
    }
    if (series.length >= 1) {
      const data = yearCols.map((c) => ({ year: table.headers[c], ...buckets[table.headers[c]] }));
      return { type: "line", data, series };
    }
  }

  /* 2 ── comparison: multiple numeric entity columns */
  if (table.headers.length >= 3 && table.rows.length >= 2) {
    const numCols: number[] = [];
    for (let c = 1; c < table.headers.length; c++) {
      const n = table.rows.filter((r) => parseNumeric(r[c] ?? "") !== null).length;
      if (n >= table.rows.length * 0.4) numCols.push(c);
    }
    if (numCols.length >= 1) {
      const series = numCols.map((c) => table.headers[c]);
      const data: Record<string, unknown>[] = [];
      for (const row of table.rows) {
        const vals = numCols.map((c) => parseNumeric(row[c] ?? "") ?? 0);
        if (vals.every((v) => v === 0)) continue;
        const mx = Math.max(...vals.map(Math.abs));
        const mn = Math.min(...vals.filter((v) => v !== 0).map(Math.abs));
        if (mn > 0 && mx / mn > 100) continue;
        const d: Record<string, unknown> = { label: row[0] ?? "" };
        numCols.forEach((c, i) => { d[series[i]] = parseNumeric(row[c] ?? "") ?? 0; });
        data.push(d);
      }
      if (data.length >= 2) return { type: "bar", data, series };
    }
  }

  /* 3 ── distribution: percentage column */
  if (table.rows.length >= 2 && table.rows.length <= 10) {
    for (let c = 1; c < table.headers.length; c++) {
      if (table.rows.every((r) => (r[c] ?? "").includes("%"))) {
        const data = table.rows
          .map((r) => ({ name: r[0] ?? "", value: parseFloat((r[c] ?? "").replace(/[%,$]/g, "")) || 0 }))
          .filter((d) => d.value > 0);
        if (data.length >= 2) return { type: "pie", data, series: [] };
      }
    }
  }

  return null;
}

/* ─── Chart components ─── */

function TrendChart({ data, series }: { data: Record<string, unknown>[]; series: string[] }) {
  return (
    <div className="chart-appear rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <TrendingUp size={13} className="text-blue-500" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Key Metrics Over Time
        </span>
      </div>
      <ResponsiveContainer width="100%" height={210}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={smartFmt} />
          <Tooltip formatter={(v) => smartFmt(Number(v))} contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          {series.map((s, i) => (
            <Line key={s} type="monotone" dataKey={s} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ComparisonChart({ data, series }: { data: Record<string, unknown>[]; series: string[] }) {
  return (
    <div className="chart-appear rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <BarChart3 size={13} className="text-emerald-500" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Comparison
        </span>
        <div className="ml-auto flex gap-3">
          {series.map((s, i) => (
            <span key={s} className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
              {s}
            </span>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(160, data.length * 44)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap="22%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={smartFmt} />
          <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 11, fill: "#475569" }} tickLine={false} axisLine={false} />
          <Tooltip formatter={(v) => smartFmt(Number(v))} contentStyle={tooltipStyle} />
          {series.map((s, i) => (
            <Bar key={s} dataKey={s} fill={PALETTE[i % PALETTE.length]} radius={[0, 4, 4, 0]} maxBarSize={20} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DonutChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="chart-appear rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50 p-4">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Distribution</p>
      <div className="flex items-center gap-6">
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={36} outerRadius={64} dataKey="value" strokeWidth={2} stroke="#fff">
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-1.5">
          {data.map((d, i) => (
            <span key={d.name} className="flex items-center gap-2 text-[11px] text-slate-600">
              <span className="inline-block h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
              <span className="max-w-[100px] truncate">{d.name}</span>
              <span className="ml-1 font-semibold text-slate-800">{d.value}%</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const tooltipStyle: React.CSSProperties = {
  fontSize: 12,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
};

function RenderChart({ info }: { info: ChartInfo }) {
  if (info.type === "line") return <TrendChart data={info.data} series={info.series} />;
  if (info.type === "bar") return <ComparisonChart data={info.data} series={info.series} />;
  if (info.type === "pie") return <DonutChart data={info.data as { name: string; value: number }[]} />;
  return null;
}

/* ─── Table card ─── */

function TableCard({ table }: { table: ParsedTable }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              {table.headers.map((h, i) => (
                <th key={i} className="whitespace-nowrap px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, ri) => (
              <tr key={ri} className="border-b border-slate-50 transition-colors hover:bg-blue-50/40">
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`max-w-[140px] truncate whitespace-nowrap px-3 py-1.5 ${
                      ci === 0 ? "font-medium text-slate-700" : "font-mono text-slate-500"
                    }`}
                    title={cell}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-50 px-3 py-1.5 text-[10px] text-slate-400">
        {table.rows.length} rows &times; {table.headers.length} cols
      </div>
    </div>
  );
}

/* ─── Table group (grid + charts) ─── */

function TableGroup({ tables }: { tables: ParsedTable[] }) {
  const charts = useMemo(
    () => tables.map(buildChart).filter((c): c is ChartInfo => c !== null),
    [tables],
  );
  const [showCharts, setShowCharts] = useState(true);

  const gridCols =
    tables.length >= 3
      ? "md:grid-cols-3"
      : tables.length === 2
        ? "md:grid-cols-2"
        : "";

  return (
    <div className="my-4 space-y-3">
      <div className={`grid grid-cols-1 gap-3 ${gridCols}`}>
        {tables.map((t, i) => (
          <TableCard key={i} table={t} />
        ))}
      </div>

      {charts.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowCharts((p) => !p)}
            className="flex items-center gap-1 text-[11px] font-medium text-blue-500 transition-colors hover:text-blue-700"
          >
            {showCharts ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {showCharts ? "Hide charts" : "Show charts"}
          </button>
          {showCharts && (
            <div className="space-y-3">
              {charts.map((c, i) => (
                <RenderChart key={i} info={c} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Code block with line numbers ─── */

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const lines = code.replace(/\n$/, "").split("\n");

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-slate-700/40 bg-[#0d1117]">
      <div className="flex items-center justify-between border-b border-slate-700/30 px-4 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="flex h-6 w-6 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-700 hover:text-slate-300"
          title="Copy code"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
      <div className="overflow-x-auto p-4">
        <pre className="text-[12px] leading-[1.65]">
          {lines.map((line, i) => (
            <div key={i} className="flex">
              <span className="mr-5 inline-block w-7 shrink-0 select-none text-right font-mono text-slate-600">
                {i + 1}
              </span>
              <code className="font-mono text-slate-300">{line || " "}</code>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

/* ─── Markdown component overrides ─── */

const mdComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-3 mt-6 text-[15px] font-bold text-slate-900">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-6 flex items-center gap-2 border-l-[3px] border-blue-400 pl-3 text-sm font-bold text-slate-900">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1.5 mt-4 text-[13px] font-bold text-slate-800">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="my-2 text-[13px] leading-relaxed text-slate-600">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-2 space-y-1 pl-4 text-[13px] text-slate-600">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 space-y-1 pl-4 text-[13px] text-slate-600">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="list-disc leading-relaxed marker:text-slate-400">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900">{children}</strong>
  ),
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline underline-offset-2 hover:text-blue-700">
      {children}
    </a>
  ),
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children }) => {
    const langMatch = className?.match(/language-(\w+)/);
    if (langMatch) {
      return <CodeBlock code={String(children).replace(/\n$/, "")} language={langMatch[1]} />;
    }
    return (
      <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
        {children}
      </code>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-[3px] border-slate-300 pl-3 italic text-slate-500">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-slate-100" />,
  table: () => null,
  thead: () => null,
  tbody: () => null,
  tr: () => null,
  th: () => null,
  td: () => null,
};

/* ─── Exported components ─── */

export function AssistantMessage({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const segments = useMemo(() => parseContent(content), [content]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="msg-appear flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 shadow-sm">
        <BotMessageSquare size={14} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="group/msg relative rounded-2xl rounded-tl-md border border-slate-200/80 bg-white px-5 py-4 shadow-sm">
          <button
            type="button"
            onClick={handleCopy}
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-600 group-hover/msg:opacity-100"
            title="Copy response"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>

          {segments.map((seg, i) => {
            if (seg.kind === "md") {
              return (
                <ReactMarkdown key={i} remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {seg.text}
                </ReactMarkdown>
              );
            }
            return <TableGroup key={i} tables={seg.tables} />;
          })}
        </div>
      </div>
    </div>
  );
}

export function UserMessage({ content, userName }: { content: string; userName?: string | null }) {
  return (
    <div className="msg-appear flex items-start justify-end gap-3">
      <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-slate-900 px-5 py-3.5 text-[13px] leading-relaxed text-white shadow-sm">
        {content}
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-[11px] font-bold text-white shadow-sm">
        {userName?.charAt(0)?.toUpperCase() || "U"}
      </div>
    </div>
  );
}
