"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Globe,
} from "lucide-react";

import type { ForexPair } from "@/lib/forex-client";

const CURRENCY_TO_COUNTRY: Record<string, string> = {
  USD: "us", EUR: "eu", GBP: "gb", JPY: "jp", CHF: "ch", CAD: "ca",
  AUD: "au", NZD: "nz", SEK: "se", NOK: "no", DKK: "dk", PLN: "pl",
  CZK: "cz", HUF: "hu", RON: "ro", BGN: "bg", HRK: "hr", RSD: "rs",
  TRY: "tr", RUB: "ru", CNY: "cn", INR: "in", KRW: "kr", SGD: "sg",
  HKD: "hk", THB: "th", MYR: "my", IDR: "id", PHP: "ph", VND: "vn",
  BRL: "br", MXN: "mx", ARS: "ar", CLP: "cl", COP: "co", PEN: "pe",
  UYU: "uy", ZAR: "za", EGP: "eg", NGN: "ng", KES: "ke", GHS: "gh",
};

const PRECIOUS: Record<string, { symbol: string; gradient: string }> = {
  XAU: { symbol: "Au", gradient: "from-yellow-400 to-yellow-600" },
  XAG: { symbol: "Ag", gradient: "from-slate-300 to-slate-500" },
  XPT: { symbol: "Pt", gradient: "from-slate-200 to-slate-400" },
  XPD: { symbol: "Pd", gradient: "from-zinc-300 to-zinc-500" },
};

function CurrencyFlag({ code }: { code: string }) {
  const precious = PRECIOUS[code];
  if (precious) {
    return (
      <div
        className={`flex h-4 w-6 items-center justify-center rounded-sm bg-gradient-to-r ${precious.gradient}`}
      >
        <span className="text-[9px] font-bold text-white">
          {precious.symbol}
        </span>
      </div>
    );
  }

  const country = CURRENCY_TO_COUNTRY[code];
  if (country) {
    return (
      <Image
        src={`https://flagcdn.com/w40/${country}.png`}
        alt={code}
        width={24}
        height={16}
        className="h-4 w-6 rounded-sm object-cover"
      />
    );
  }

  return (
    <div className="flex h-4 w-6 items-center justify-center rounded-sm bg-slate-200">
      <span className="text-[9px] text-slate-500">{code.charAt(0)}</span>
    </div>
  );
}

type SortKey = "symbol" | "fromCurrency" | "toCurrency";

interface ForexDataTableProps {
  data: ForexPair[];
  onPairSelect: (pair: ForexPair) => void;
}

export function ForexDataTable({ data, onPairSelect }: ForexDataTableProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = av.localeCompare(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / perPage);
  const start = (page - 1) * perPage;
  const pageData = sorted.slice(start, start + perPage);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col)
      return <ArrowUpDown size={14} className="text-slate-400" />;
    return sortDir === "asc" ? (
      <ArrowUp size={14} className="text-blue-600" />
    ) : (
      <ArrowDown size={14} className="text-blue-600" />
    );
  };

  const visiblePages = useMemo(() => {
    const pages: number[] = [];
    const half = 2;
    let lo = Math.max(1, page - half);
    const hi = Math.min(totalPages, lo + 4);
    lo = Math.max(1, hi - 4);
    for (let i = lo; i <= hi; i++) pages.push(i);
    return pages;
  }, [page, totalPages]);

  if (!data.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <Globe className="mx-auto mb-3 text-slate-300" size={40} />
        <p className="text-sm font-medium text-slate-700">
          No forex pairs found
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Try adjusting your search criteria or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <h3 className="text-sm font-semibold text-slate-800">
          Currency Pairs ({sorted.length})
        </h3>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Rows</span>
          <select
            value={perPage}
            onChange={(e) => {
              setPerPage(Number(e.target.value));
              setPage(1);
            }}
            className="rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80">
            <tr>
              {(
                [
                  ["symbol", "Currency Pair"],
                  ["fromCurrency", "Base Currency"],
                  ["toCurrency", "Quote Currency"],
                ] as [SortKey, string][]
              ).map(([key, label]) => (
                <th key={key} className="px-5 py-2.5">
                  <button
                    onClick={() => handleSort(key)}
                    className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600"
                  >
                    {label}
                    <SortIcon col={key} />
                  </button>
                </th>
              ))}
              <th className="px-5 py-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Names
                </span>
              </th>
              <th className="px-5 py-2.5 text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Actions
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageData.map((pair) => (
              <tr
                key={pair.symbol}
                className="transition-colors hover:bg-slate-50/60"
              >
                <td className="whitespace-nowrap px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1">
                      <CurrencyFlag code={pair.fromCurrency} />
                      <ArrowRightLeft size={10} className="text-slate-300" />
                      <CurrencyFlag code={pair.toCurrency} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        {pair.symbol}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {pair.fromCurrency}/{pair.toCurrency}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-5 py-3">
                  <div className="flex items-center gap-2">
                    <CurrencyFlag code={pair.fromCurrency} />
                    <div>
                      <p className="text-xs font-medium text-slate-700">
                        {pair.fromCurrency}
                      </p>
                      <p className="max-w-[100px] truncate text-[11px] text-slate-400">
                        {pair.fromName}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-5 py-3">
                  <div className="flex items-center gap-2">
                    <CurrencyFlag code={pair.toCurrency} />
                    <div>
                      <p className="text-xs font-medium text-slate-700">
                        {pair.toCurrency}
                      </p>
                      <p className="max-w-[100px] truncate text-[11px] text-slate-400">
                        {pair.toName}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <p className="text-xs font-medium text-slate-700">
                    {pair.fromName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {pair.toName}
                  </p>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-center">
                  <button
                    onClick={() => onPairSelect(pair)}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                  >
                    <BarChart3 size={12} />
                    View Chart
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <p className="text-xs text-slate-400">
            {start + 1}–{Math.min(start + perPage, sorted.length)} of{" "}
            {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:text-slate-300"
            >
              <ChevronLeft size={14} />
            </button>
            {visiblePages.map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  n === page
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:text-slate-300"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
