"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle2,
  Database,
  GitBranch,
  GitMerge,
  Loader2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

import type { AgentStep } from "@/lib/valuation-client";

interface AgentInsightsPanelProps {
  steps: AgentStep[];
  isActive: boolean;
  isComplete: boolean;
  totalDuration: number | null;
  onClose: () => void;
}

const ICON_MAP: Record<
  string,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  brain: Brain,
  "git-branch": GitBranch,
  "trending-up": TrendingUp,
  "book-open": BookOpen,
  "git-merge": GitMerge,
  sparkles: Sparkles,
  "shield-check": ShieldCheck,
  database: Database,
  "bar-chart": BarChart3,
};

const ICON_STYLES: Record<string, { active: string; completed: string }> = {
  brain: {
    active: "text-purple-500 bg-purple-100 shadow-purple-200/50",
    completed: "text-purple-600 bg-purple-50",
  },
  "git-branch": {
    active: "text-blue-500 bg-blue-100 shadow-blue-200/50",
    completed: "text-blue-600 bg-blue-50",
  },
  "trending-up": {
    active: "text-orange-500 bg-orange-100 shadow-orange-200/50",
    completed: "text-orange-600 bg-orange-50",
  },
  "book-open": {
    active: "text-indigo-500 bg-indigo-100 shadow-indigo-200/50",
    completed: "text-indigo-600 bg-indigo-50",
  },
  "git-merge": {
    active: "text-cyan-500 bg-cyan-100 shadow-cyan-200/50",
    completed: "text-cyan-600 bg-cyan-50",
  },
  sparkles: {
    active: "text-amber-500 bg-amber-100 shadow-amber-200/50",
    completed: "text-amber-600 bg-amber-50",
  },
  "shield-check": {
    active: "text-emerald-500 bg-emerald-100 shadow-emerald-200/50",
    completed: "text-emerald-600 bg-emerald-50",
  },
  database: {
    active: "text-rose-500 bg-rose-100 shadow-rose-200/50",
    completed: "text-rose-600 bg-rose-50",
  },
  "bar-chart": {
    active: "text-sky-500 bg-sky-100 shadow-sky-200/50",
    completed: "text-sky-600 bg-sky-50",
  },
};

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

export function AgentInsightsPanel({
  steps,
  isActive,
  isComplete,
  totalDuration,
  onClose,
}: AgentInsightsPanelProps) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startRef.current = Date.now();
    setElapsed(0);
  }, [isActive]);

  useEffect(() => {
    if (!isActive || isComplete) return;
    const id = setInterval(() => setElapsed(Date.now() - startRef.current), 100);
    return () => clearInterval(id);
  }, [isActive, isComplete]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [steps.length]);

  const completedCount = steps.filter((s) => s.status === "completed").length;
  const displayTime = totalDuration ?? elapsed;
  const allDone = isComplete && steps.length > 0;

  const hasPlanning = completedCount >= 2;
  const hasLiveData = steps.some(
    (s) => s.icon === "database" && s.status === "completed",
  );
  const hasResearch = steps.some(
    (s) => s.icon === "book-open" && s.status === "completed",
  );

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 shadow-lg shadow-teal-500/25">
            <Zap size={18} className="text-white" />
            {isActive && !isComplete && (
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-400 insights-pulse" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Agent Insights</h3>
            <p className="text-xs font-semibold text-teal-600">
              {formatDuration(displayTime)} · {steps.length} steps
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={14} />
        </button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-2 px-5 pt-4">
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Request Type
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-800">
            Valuation Analysis
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Strategy
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-800">
            {hasLiveData ? "Live data + reasoning" : "Full pipeline · reasoning"}
          </p>
        </div>
      </div>

      {/* Badges */}
      <div className="mt-3 flex flex-wrap gap-1.5 px-5">
        <StatusBadge
          icon={Sparkles}
          label="Deep Reasoning"
          active={hasPlanning}
          colorClass="bg-purple-50 text-purple-600 border-purple-100"
          inactiveClass="bg-slate-50 text-slate-400 border-slate-100"
        />
        <StatusBadge
          icon={Database}
          label="Live Data"
          active={hasLiveData}
          colorClass="bg-rose-50 text-rose-600 border-rose-100"
          inactiveClass="bg-slate-50 text-slate-400 border-slate-100"
        />
        <StatusBadge
          icon={Brain}
          label="Plan Built"
          active={hasPlanning}
          colorClass="bg-teal-50 text-teal-600 border-teal-100"
          inactiveClass="bg-slate-50 text-slate-400 border-slate-100"
        />
        <StatusBadge
          icon={CheckCircle2}
          label={allDone ? "Verified" : "Verifying..."}
          active={allDone}
          colorClass="bg-emerald-50 text-emerald-600 border-emerald-100"
          inactiveClass="bg-slate-50 text-slate-400 border-slate-100"
        />
      </div>

      {/* Steps Timeline */}
      <div className="mt-4 px-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Key Decision Points
        </p>
      </div>

      <div ref={scrollRef} className="mt-2 flex-1 overflow-y-auto px-5 pb-4">
        <div className="relative">
          {steps.length > 1 && (
            <div className="absolute left-[15px] top-[20px] bottom-[20px] w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" />
          )}

          <div className="space-y-0.5">
            {steps.map((step, i) => (
              <StepItem
                key={`${step.id}-${i}`}
                step={step}
                index={i}
              />
            ))}
          </div>
        </div>

        {steps.length === 0 && isActive && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={20} className="animate-spin text-teal-500" />
              <p className="text-xs text-slate-400">Initializing agent pipeline...</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {allDone && (
        <div className="mx-4 mb-4 step-appear">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
              <CheckCircle2 size={16} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-800">
                Response delivered
              </p>
              <p className="text-[11px] text-emerald-600">
                All pipelines completed successfully
              </p>
            </div>
          </div>
        </div>
      )}

      {isActive && !isComplete && (hasResearch || hasLiveData) && (
        <div className="mx-4 mb-4">
          <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3">
            <Loader2 size={14} className="animate-spin text-blue-500 shrink-0" />
            <p className="text-[11px] font-medium text-blue-700">
              {hasLiveData
                ? "Analyzing live data and synthesizing..."
                : "Synthesizing final analysis..."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  icon: Icon,
  label,
  active,
  colorClass,
  inactiveClass,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  active: boolean;
  colorClass: string;
  inactiveClass: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all duration-500 ${
        active ? colorClass : inactiveClass
      }`}
    >
      <Icon size={12} />
      {label}
    </span>
  );
}

function StepItem({
  step,
  index,
}: {
  step: AgentStep;
  index: number;
}) {
  const Icon = ICON_MAP[step.icon] || Brain;
  const styles = ICON_STYLES[step.icon] || ICON_STYLES.brain;
  const isRunning = step.status === "running";
  const isDone = step.status === "completed";

  return (
    <div
      className="step-appear relative flex items-start gap-3 py-2"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div
        className={`relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg transition-all duration-300 ${
          isRunning
            ? `${styles.active} shadow-md`
            : isDone
              ? styles.completed
              : "bg-slate-100 text-slate-400"
        }`}
      >
        {isRunning ? (
          <Loader2 size={14} className="animate-spin" />
        ) : isDone ? (
          <Icon size={14} />
        ) : (
          <div className="h-2 w-2 rounded-full bg-slate-300" />
        )}
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-center gap-2">
          <p
            className={`text-xs font-semibold leading-tight ${
              isDone ? "text-slate-800" : isRunning ? "text-slate-700" : "text-slate-400"
            }`}
          >
            {step.name}
          </p>
          {isDone && step.duration != null && step.duration > 0 && (
            <span className="text-[10px] font-medium text-slate-400">
              {formatDuration(step.duration)}
            </span>
          )}
        </div>
        <p
          className={`mt-0.5 text-[11px] leading-relaxed ${
            isDone ? "text-slate-500" : isRunning ? "text-slate-500" : "text-slate-400"
          }`}
        >
          {step.description}
        </p>
      </div>
    </div>
  );
}
