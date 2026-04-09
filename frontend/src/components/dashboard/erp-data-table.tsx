"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Filter,
  Globe,
  Search,
} from "lucide-react";

import type { ERPCountry } from "@/lib/erp-client";

type SortKey = "country" | "continent" | "countryRiskPremium" | "totalEquityRiskPremium";

function riskLevel(erp: number) {
  if (erp <= 5) return { label: "Low", bg: "bg-emerald-50", text: "text-emerald-700" };
  if (erp <= 10) return { label: "Medium", bg: "bg-amber-50", text: "text-amber-700" };
  return { label: "High", bg: "bg-red-50", text: "text-red-700" };
}

interface Props {
  data: ERPCountry[];
  onCountryClick: (country: ERPCountry) => void;
  onCountrySelect?: (countryName: string) => void;
  selectedCountries?: string[];
}

export function ERPDataTable({
  data,
  onCountryClick,
  onCountrySelect,
  selectedCountries = [],
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("totalEquityRiskPremium");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");
  const [continent, setContinent] = useState("all");

  const continents = useMemo(
    () => [...new Set(data.map((d) => d.continent))].filter(Boolean).sort(),
    [data],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data
      .filter((d) => {
        const matchSearch = !q || d.country.toLowerCase().includes(q);
        const matchContinent = continent === "all" || d.continent === continent;
        return matchSearch && matchContinent;
      })
      .sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (typeof av === "string" && typeof bv === "string") {
          return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
        }
        return sortDir === "asc"
          ? (av as number) - (bv as number)
          : (bv as number) - (av as number);
      });
  }, [data, search, continent, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={13} className="text-slate-400" />;
    return sortDir === "asc" ? (
      <ChevronUp size={13} className="text-blue-600" />
    ) : (
      <ChevronDown size={13} className="text-blue-600" />
    );
  };

  if (!data.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <Globe className="mx-auto mb-3 text-slate-300" size={40} />
        <p className="text-sm font-medium text-slate-700">No ERP data available</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* Header */}
      <div className="border-b border-slate-100 px-5 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Country Risk Premium Data
            </h3>
            <p className="text-[11px] text-slate-400">
              {data.length} countries · Click a row for details
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input
                type="text"
                placeholder="Search countries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-48 rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <select
                value={continent}
                onChange={(e) => setContinent(e.target.value)}
                className="rounded-lg border border-slate-200 py-1.5 pl-8 pr-6 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Continents</option>
                {continents.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80">
            <tr>
              {onCountrySelect && (
                <th className="w-10 px-3 py-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Sel
                  </span>
                </th>
              )}
              {(
                [
                  ["country", "Country"],
                  ["continent", "Continent"],
                  ["countryRiskPremium", "Country Risk Premium"],
                  ["totalEquityRiskPremium", "Total ERP"],
                ] as [SortKey, string][]
              ).map(([key, label]) => (
                <th key={key} className="px-4 py-2.5">
                  <button
                    onClick={() => handleSort(key)}
                    className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600"
                  >
                    {label}
                    <SortIcon col={key} />
                  </button>
                </th>
              ))}
              <th className="px-4 py-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Risk Level
                </span>
              </th>
              <th className="px-4 py-2.5 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Action
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((d) => {
              const risk = riskLevel(d.totalEquityRiskPremium);
              const isSelected = selectedCountries.includes(d.country);
              return (
                <tr
                  key={d.country}
                  className={`transition-colors hover:bg-slate-50/60 ${isSelected ? "bg-emerald-50/40" : ""}`}
                >
                  {onCountrySelect && (
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onCountrySelect(d.country)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                  )}
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="text-xs font-semibold text-slate-800">
                      {d.country}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="text-xs text-slate-500">{d.continent}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="text-xs font-medium text-slate-800">
                      {d.countryRiskPremium}%
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="text-xs font-semibold text-slate-900">
                      {d.totalEquityRiskPremium}%
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${risk.bg} ${risk.text}`}
                    >
                      {risk.label}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    <button
                      onClick={() => onCountryClick(d)}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-2.5">
        <p className="text-[11px] text-slate-400">
          Showing {filtered.length} of {data.length} countries
        </p>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-emerald-200" /> Low ≤5%
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-amber-200" /> Medium 5-10%
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-red-200" /> High &gt;10%
          </span>
        </div>
      </div>
    </div>
  );
}
