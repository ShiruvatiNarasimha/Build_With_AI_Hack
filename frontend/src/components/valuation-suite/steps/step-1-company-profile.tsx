"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Building2,
  ExternalLink,
  Globe,
  Layers,
  Link2,
  Loader2,
  MapPin,
  Shield,
  Sparkles,
  Star,
  Tag,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import {
  streamCompanyProfile,
  type AgentStep,
  type CompanyProfile,
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
  if (abs >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(num / 1e3).toFixed(0)}K`;
  return `$${num.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function pct(num: number | null | undefined) {
  if (num == null || isNaN(num)) return "—";
  return `${(num * 100).toFixed(1)}%`;
}

function fmtX(num: number | null | undefined) {
  if (num == null || isNaN(num)) return "—";
  return `${num.toFixed(1)}x`;
}

function fmtDec(num: number | null | undefined, decimals = 2) {
  if (num == null || isNaN(num)) return "—";
  return num.toFixed(decimals);
}

export function StepCompanyProfile({
  valuation,
  accessToken,
  onRefresh,
  onNext,
  onAgentStep,
  clearAgentSteps,
  isProcessing,
  setIsProcessing,
}: StepProps) {
  const profile = valuation.companyProfile;

  const [companyName, setCompanyName] = useState(profile?.companyName || "");
  const [website, setWebsite] = useState(profile?.website || "");
  const [linkedin, setLinkedin] = useState(profile?.linkedin || "");
  const [description, setDescription] = useState(profile?.description || "");

  const handleAiGenerate = async () => {
    if (!companyName.trim()) {
      toast.error("Please enter a company name.");
      return;
    }
    clearAgentSteps();
    setIsProcessing(true);
    try {
      await streamCompanyProfile(
        accessToken,
        valuation.id,
        {
          companyName: companyName.trim(),
          website: website.trim() || undefined,
          linkedin: linkedin.trim() || undefined,
          description: description.trim() || undefined,
        },
        {
          onStep: onAgentStep,
          onComplete: async () => {
            await onRefresh();
            toast.success("Company profile generated with live market data!");
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate profile.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Building2 className="h-5 w-5 text-violet-400" />
          Company Profile
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Enter the company name — AI will research it, pull live FMP market
          data, and build a full investment-grade profile.
        </p>
      </div>

      {/* Input Form */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Company Name *
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Tesla, Stripe, Databricks, CrowdStrike"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            <Globe className="inline h-3 w-3 mr-1" /> Website
          </label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            <Link2 className="inline h-3 w-3 mr-1" /> LinkedIn URL
          </label>
          <input
            type="url"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            placeholder="https://linkedin.com/company/..."
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Additional Context (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Any extra info to help AI: round stage, acquirer interest, private company context..."
            rows={2}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/30 resize-none"
          />
        </div>
      </div>

      <button
        onClick={handleAiGenerate}
        disabled={isProcessing || !companyName.trim()}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:shadow-violet-500/30 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {isProcessing ? "AI is Researching..." : "Generate Profile with AI"}
      </button>

      {/* ─── PROFILE DISPLAY ─── */}
      {profile && <ProfileDisplay profile={profile} onNext={onNext} />}
    </div>
  );
}

/* ─────────────────────── Profile Display ─────────────────────── */

function ProfileDisplay({
  profile: p,
  onNext,
}: {
  profile: CompanyProfile;
  onNext: () => void;
}) {
  const md = p.marketData;
  const vm = p.valuationMultiples;
  const prof = p.profitability;
  const cap = p.capitalStructure;
  const em = p.enterpriseMetrics;
  const dcf = p.dcfAnalysis;
  const gm = p.growthMetrics;
  const ae = p.analystEstimates;
  const snap = p.incomeSnapshot;
  const isPublic = p.stage === "Public" && md;

  return (
    <div className="space-y-6">
      <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

      {/* ── Hero: Company Header + Quality Score ── */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-xl font-bold text-white">
                {p.companyName}
              </h3>
              {p.ticker && (
                <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-mono font-bold text-blue-400">
                  {p.exchange}:{p.ticker}
                </span>
              )}
              {p.stage && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                    p.stage === "Public"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-violet-500/10 text-violet-400"
                  }`}
                >
                  {p.stage}
                </span>
              )}
            </div>
            {p.legalName && p.legalName !== p.companyName && (
              <p className="text-xs text-slate-500 mb-2">
                Legal: {p.legalName}
              </p>
            )}
            {p.description && (
              <p className="text-sm text-slate-300 leading-relaxed mb-3">
                {p.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
              {p.industry && (
                <span className="flex items-center gap-1">
                  <Tag className="h-3 w-3" /> {p.sector} — {p.industry}
                </span>
              )}
              {p.headquarters && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {p.headquarters}
                </span>
              )}
              {p.employees && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> {p.employees} employees
                </span>
              )}
              {p.foundedYear && <span>Founded {p.foundedYear}</span>}
              {p.ceo && <span>CEO: {p.ceo}</span>}
            </div>
            {(p.website || p.linkedin) && (
              <div className="flex items-center gap-3 mt-3">
                {p.website && (
                  <a href={p.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                    <ExternalLink className="h-3 w-3" /> Website
                  </a>
                )}
                {p.linkedin && (
                  <a href={p.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                    <Link2 className="h-3 w-3" /> LinkedIn
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Quality Score Gauge */}
          {p.qualityScore != null && (
            <div className="shrink-0 flex flex-col items-center">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-slate-800">
                <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-800" />
                  <circle cx="40" cy="40" r="36" fill="none" strokeWidth="4" strokeDasharray={`${(p.qualityScore / 100) * 226} 226`} strokeLinecap="round"
                    className={p.qualityScore >= 70 ? "text-emerald-500" : p.qualityScore >= 40 ? "text-amber-500" : "text-red-500"}
                  />
                </svg>
                <span className="text-lg font-bold text-white">{p.qualityScore}</span>
              </div>
              <p className="mt-1 text-[10px] text-slate-500 uppercase tracking-wider">
                Quality Score
              </p>
            </div>
          )}
        </div>

        {/* Investment Thesis */}
        {p.investmentThesis && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <p className="text-[10px] text-violet-400 uppercase tracking-wider font-semibold mb-1">
              AI Investment Thesis
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              {p.investmentThesis}
            </p>
          </div>
        )}

        {/* Key Metrics Highlights */}
        {p.keyMetricsHighlight && p.keyMetricsHighlight.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {p.keyMetricsHighlight.map((h, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300">
                <Zap className="h-3 w-3 text-amber-400" />
                {h}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Market Data (Public companies only) ── */}
      {isPublic && md && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> Market Snapshot — Live
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            <MetricCell label="Stock Price" value={`$${fmtDec(md.price)}`}
              sub={md.changePercent != null ? (
                <span className={md.changePercent >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {md.changePercent >= 0 ? "+" : ""}{md.changePercent.toFixed(2)}%
                </span>
              ) : undefined}
            />
            <MetricCell label="Market Cap" value={fmt(md.marketCap)} />
            <MetricCell label="Enterprise Value" value={fmt(em?.enterpriseValue)} />
            <MetricCell label="P/E Ratio" value={fmtX(md.pe)} />
            <MetricCell label="EPS" value={`$${fmtDec(md.eps)}`} />
            <MetricCell label="52W Range" value={`$${fmtDec(md.yearLow, 0)} – $${fmtDec(md.yearHigh, 0)}`} />
          </div>
        </div>
      )}

      {/* ── DCF Intrinsic Value ── */}
      {dcf?.dcfFairValue && (
        <div className={`rounded-xl border p-5 ${
          (dcf.upside ?? 0) >= 0
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-red-500/30 bg-red-500/5"
        }`}>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" /> DCF Intrinsic Value Analysis
          </h4>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">DCF Fair Value</p>
              <p className="text-xl font-bold text-white font-mono">${fmtDec(dcf.dcfFairValue)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">Current Price</p>
              <p className="text-xl font-bold text-slate-300 font-mono">${fmtDec(dcf.stockPrice)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">Upside/Downside</p>
              <p className={`text-xl font-bold font-mono flex items-center gap-1 ${(dcf.upside ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {(dcf.upside ?? 0) >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                {dcf.upside != null ? `${dcf.upside.toFixed(1)}%` : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Valuation Multiples + Profitability ── */}
      {(vm || prof) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {vm && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <h4 className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-3">
                Valuation Multiples
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <MetricCell label="EV/EBITDA" value={fmtX(vm.evEbitda)} small />
                <MetricCell label="EV/Revenue" value={fmtX(vm.evRevenue)} small />
                <MetricCell label="P/E" value={fmtX(vm.peRatio)} small />
                <MetricCell label="P/B" value={fmtX(vm.pbRatio)} small />
                <MetricCell label="PEG" value={fmtX(vm.pegRatio)} small />
                <MetricCell label="P/FCF" value={fmtX(vm.priceToFcf)} small />
              </div>
            </div>
          )}
          {prof && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">
                Profitability & Returns
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <MetricCell label="Gross Margin" value={pct(prof.grossMargin)} small />
                <MetricCell label="Operating Margin" value={pct(prof.operatingMargin)} small />
                <MetricCell label="Net Margin" value={pct(prof.netMargin)} small />
                <MetricCell label="ROE" value={pct(prof.roe)} small />
                <MetricCell label="ROA" value={pct(prof.roa)} small />
                <MetricCell label="ROIC" value={pct(prof.roic)} small />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Growth Metrics + Capital Structure ── */}
      {(gm || cap) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {gm && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Growth (YoY)
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <GrowthCell label="Revenue" value={gm.revenueGrowth} />
                <GrowthCell label="EBITDA" value={gm.ebitdaGrowth} />
                <GrowthCell label="Net Income" value={gm.netIncomeGrowth} />
                <GrowthCell label="EPS" value={gm.epsGrowth} />
                <GrowthCell label="FCF" value={gm.fcfGrowth} />
                <GrowthCell label="Gross Profit" value={gm.grossProfitGrowth} />
              </div>
            </div>
          )}
          {cap && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Capital Structure & Health
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <MetricCell label="Debt/Equity" value={fmtDec(cap.debtToEquity)} small />
                <MetricCell label="Current Ratio" value={fmtDec(cap.currentRatio)} small />
                <MetricCell label="Quick Ratio" value={fmtDec(cap.quickRatio)} small />
                <MetricCell label="Interest Coverage" value={fmtDec(cap.interestCoverage)} small />
                <MetricCell label="Dividend Yield" value={pct(cap.dividendYield)} small />
                <MetricCell label="Payout Ratio" value={pct(cap.payoutRatio)} small />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Income Snapshot (Last 3-4 years) ── */}
      {snap && snap.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">
            Income Statement Snapshot
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left text-xs text-slate-500 pb-2 pr-4">Metric</th>
                  {snap.map((s) => (
                    <th key={s.period} className="text-right text-xs text-slate-500 pb-2 px-3 font-mono">{s.period}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                <SnapshotRow label="Revenue" data={snap} field="revenue" formatter={fmt} />
                <SnapshotRow label="Gross Profit" data={snap} field="grossProfit" formatter={fmt} />
                <SnapshotRow label="EBITDA" data={snap} field="ebitda" formatter={fmt} />
                <SnapshotRow label="Net Income" data={snap} field="netIncome" formatter={fmt} />
                <SnapshotRow label="EPS" data={snap} field="eps" formatter={(v) => v != null ? `$${fmtDec(v)}` : "—"} />
                <SnapshotRow label="Gross Margin" data={snap} field="grossMargin" formatter={pct} highlight />
                <SnapshotRow label="Net Margin" data={snap} field="netMargin" formatter={pct} highlight />
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Analyst Estimates ── */}
      {ae && ae.numberOfAnalysts && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3">
            Analyst Consensus ({ae.numberOfAnalysts} analysts) — {ae.date}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCell label="Est. Revenue (Avg)" value={fmt(ae.estimatedRevenueAvg)} />
            <MetricCell label="Est. Revenue Range" value={`${fmt(ae.estimatedRevenueLow)} – ${fmt(ae.estimatedRevenueHigh)}`} />
            <MetricCell label="Est. EPS (Avg)" value={ae.estimatedEpsAvg != null ? `$${fmtDec(ae.estimatedEpsAvg)}` : "—"} />
            <MetricCell label="Est. EPS Range" value={`$${fmtDec(ae.estimatedEpsLow)} – $${fmtDec(ae.estimatedEpsHigh)}`} />
          </div>
        </div>
      )}

      {/* ── Quality Factors + Catalysts + Red Flags ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {p.qualityFactors && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Star className="h-3 w-3" /> Quality Factors
            </h4>
            <div className="space-y-2.5">
              {Object.entries(p.qualityFactors).map(([key, val]) => (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400 capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                    <span className="text-white font-mono">{val}/10</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${val >= 7 ? "bg-emerald-500" : val >= 4 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${val * 10}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {p.catalysts && p.catalysts.length > 0 && (
          <ListCard title="Catalysts" icon={<TrendingUp className="h-3 w-3 text-emerald-400" />} items={p.catalysts} color="text-emerald-300" />
        )}
        {p.redFlags && p.redFlags.length > 0 && (
          <ListCard title="Red Flags" icon={<TrendingDown className="h-3 w-3 text-red-400" />} items={p.redFlags} color="text-red-300" />
        )}
      </div>

      {/* ── Strategic Intelligence ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {p.keyProducts && p.keyProducts.length > 0 && (
          <ListCard title="Key Products / Services" items={p.keyProducts} color="text-slate-300" />
        )}
        {p.competitors && p.competitors.length > 0 && (
          <ListCard title="Competitors" items={p.competitors} color="text-slate-300" />
        )}
        {p.strengths && p.strengths.length > 0 && (
          <ListCard title="Investment Strengths" items={p.strengths} color="text-emerald-300" />
        )}
        {p.risks && p.risks.length > 0 && (
          <ListCard title="Key Risks" items={p.risks} color="text-amber-300" />
        )}
        {p.managementTeam && p.managementTeam.length > 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Management Team
            </h4>
            <div className="space-y-2">
              {p.managementTeam.map((m, i) => (
                <div key={i}>
                  <p className="text-sm font-medium text-white">{m.name}</p>
                  <p className="text-[11px] text-violet-400">{m.title}</p>
                  {m.background && (
                    <p className="text-[11px] text-slate-500 mt-0.5">{m.background}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {p.fundingHistory && p.fundingHistory.length > 0 && (
          <ListCard title="Funding / Financial Events" items={p.fundingHistory} color="text-blue-300" />
        )}
        {p.moat && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Competitive Moat
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">{p.moat}</p>
          </div>
        )}
        {p.recentNews && p.recentNews.length > 0 && (
          <ListCard title="Recent Developments" items={p.recentNews} color="text-slate-300" />
        )}
        {p.exitComparables && p.exitComparables.length > 0 && (
          <ListCard title="Exit Comparables" items={p.exitComparables} color="text-blue-300" />
        )}
      </div>

      {/* ── Keywords + Data Source ── */}
      {p.keywords && p.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {p.keywords.map((k) => (
            <span key={k} className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">
              {k}
            </span>
          ))}
        </div>
      )}

      {/* ── Continue ── */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-600">
          Data: {p.dataSource === "fmp+ai" ? "FMP Live + AI Research" : "AI Research"}
          {p.lastUpdated && ` • ${new Date(p.lastUpdated).toLocaleString()}`}
        </p>
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
        >
          Continue to Peers
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────── Shared Components ─────────────────────── */

function MetricCell({
  label,
  value,
  sub,
  small,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  small?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className={`font-mono font-semibold text-white ${small ? "text-sm" : "text-base"}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] mt-0.5">{sub}</p>}
    </div>
  );
}

function GrowthCell({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  const formatted = pct(value);
  const isPositive = value != null && value >= 0;
  return (
    <div>
      <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
      <p className={`text-sm font-mono font-semibold flex items-center gap-1 ${
        value == null ? "text-slate-500" : isPositive ? "text-emerald-400" : "text-red-400"
      }`}>
        {value != null && (isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
        {formatted}
      </p>
    </div>
  );
}

function ListCard({
  title,
  icon,
  items,
  color,
}: {
  title: string;
  icon?: React.ReactNode;
  items: string[];
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        {icon}
        {title}
      </h4>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className={`text-sm ${color}`}>
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SnapshotRow({
  label,
  data,
  field,
  formatter,
  highlight,
}: {
  label: string;
  data: NonNullable<CompanyProfile["incomeSnapshot"]>;
  field: string;
  formatter: (v: number | null | undefined) => string;
  highlight?: boolean;
}) {
  return (
    <tr>
      <td className={`py-2 pr-4 text-xs ${highlight ? "font-medium text-slate-300" : "text-slate-400"}`}>
        {label}
      </td>
      {data.map((s) => (
        <td key={s.period} className={`py-2 px-3 text-right font-mono text-xs ${highlight ? "text-emerald-400" : "text-slate-300"}`}>
          {formatter((s as unknown as Record<string, number>)[field])}
        </td>
      ))}
    </tr>
  );
}
