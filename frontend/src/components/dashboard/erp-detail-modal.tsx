"use client";

import { BarChart3, Globe, Info, TrendingUp, X } from "lucide-react";

import type { ERPCountry } from "@/lib/erp-client";

function riskLevel(erp: number) {
  if (erp <= 5)
    return { label: "Low", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
  if (erp <= 10)
    return { label: "Medium", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
  return { label: "High", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" };
}

interface Props {
  country: ERPCountry | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ERPDetailModal({ country, isOpen, onClose }: Props) {
  if (!isOpen || !country) return null;

  const risk = riskLevel(country.totalEquityRiskPremium);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <Globe size={20} className="text-blue-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">{country.country}</h2>
              <p className="text-xs text-slate-500">{country.continent}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-5">
          {/* Risk Level */}
          <div className={`rounded-xl border p-4 ${risk.bg} ${risk.border}`}>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} className={risk.text} />
              <span className={`text-sm font-semibold ${risk.text}`}>
                Risk Level: {risk.label}
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Based on total equity risk premium of {country.totalEquityRiskPremium}%
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <BarChart3 size={14} className="text-blue-600" />
                <span className="text-xs font-semibold text-blue-800">
                  Country Risk Premium
                </span>
              </div>
              <p className="text-2xl font-bold text-blue-900">
                {country.countryRiskPremium}%
              </p>
              <p className="mt-1 text-[11px] text-blue-700">
                Additional return for country-specific political and economic risks
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp size={14} className="text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-800">
                  Total Equity Risk Premium
                </span>
              </div>
              <p className="text-2xl font-bold text-emerald-900">
                {country.totalEquityRiskPremium}%
              </p>
              <p className="mt-1 text-[11px] text-emerald-700">
                Total premium investors demand over the risk-free rate
              </p>
            </div>
          </div>

          {/* Understanding */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Info size={14} className="text-slate-500" />
              <span className="text-xs font-semibold text-slate-700">
                Understanding the Metrics
              </span>
            </div>
            <div className="space-y-2 text-[11px] text-slate-600">
              <div>
                <p className="font-semibold text-slate-700">Country Risk Premium</p>
                <p>
                  Additional return investors demand for holding assets in this country
                  compared to a risk-free investment. Reflects political risk, economic
                  stability, and country-specific factors.
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-700">Total Equity Risk Premium</p>
                <p>
                  Total premium equity investors require above the risk-free rate.
                  Includes both the market risk premium and the country risk premium.
                </p>
              </div>
            </div>
          </div>

          {/* PE/VC/M&A Implications */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-2 text-xs font-semibold text-slate-700">
              PE/VC/M&A Investment Implications
            </p>
            <div className="space-y-1.5 text-[11px] text-slate-600">
              {[
                ["Cost of Equity", `Companies in ${country.country} typically require a ${country.totalEquityRiskPremium > 8 ? "significantly " : ""}higher cost of equity capital`],
                ["CAPM Impact", `Ke = Rf + β × ${country.totalEquityRiskPremium}% — affects DCF terminal values and IRR projections`],
                ["Deal Structuring", `Higher ERP may warrant earnout structures or staged commitments to mitigate country risk`],
                ["Exit Risk", `Consider FX hedging and repatriation risk when modeling exit multiples`],
              ].map(([title, desc]) => (
                <div key={title} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  <span>
                    <strong>{title}:</strong> {desc}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Classification */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-2 text-xs font-semibold text-slate-700">
              Risk Classification Benchmarks
            </p>
            <div className="space-y-1.5">
              {[
                { range: "Low Risk (0–5%)", desc: "Developed markets, stable economies", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", sub: "text-emerald-600" },
                { range: "Medium Risk (5–10%)", desc: "Emerging markets, moderate volatility", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", sub: "text-amber-600" },
                { range: "High Risk (>10%)", desc: "Frontier markets, high uncertainty", bg: "bg-red-50", border: "border-red-200", text: "text-red-800", sub: "text-red-600" },
              ].map((r) => (
                <div
                  key={r.range}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 ${r.bg} ${r.border}`}
                >
                  <span className={`text-xs font-medium ${r.text}`}>{r.range}</span>
                  <span className={`text-[10px] ${r.sub}`}>{r.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
