"use client";

import {
  BarChart3,
  Building2,
  Calculator,
  CheckCircle2,
  FileText,
  PieChart,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Company Profile", icon: Building2 },
  { id: 2, label: "Peers", icon: Users },
  { id: 3, label: "Financials", icon: TrendingUp },
  { id: 4, label: "Cap Table", icon: PieChart },
  { id: 5, label: "Methods", icon: BarChart3 },
  { id: 6, label: "Valuation", icon: Calculator },
  { id: 7, label: "Results", icon: FileText },
] as const;

interface StepBarProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
}

export function StepBar({
  currentStep,
  completedSteps,
  onStepClick,
}: StepBarProps) {
  return (
    <div className="w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4">
        <nav className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-none">
          {STEPS.map((step, idx) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = currentStep === step.id;
            const isAccessible =
              isCompleted || step.id <= Math.max(...completedSteps, 0) + 1;

            return (
              <button
                key={step.id}
                onClick={() => isAccessible && onStepClick(step.id)}
                disabled={!isAccessible}
                className={cn(
                  "group relative flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-all",
                  isCurrent
                    ? "bg-violet-500/15 text-violet-300"
                    : isCompleted
                      ? "text-emerald-400 hover:bg-emerald-500/10"
                      : isAccessible
                        ? "text-slate-400 hover:bg-slate-800 hover:text-slate-300"
                        : "text-slate-600 cursor-not-allowed",
                )}
              >
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all",
                    isCurrent
                      ? "bg-violet-500/20 ring-1 ring-violet-500/40"
                      : isCompleted
                        ? "bg-emerald-500/20"
                        : "bg-slate-800",
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <step.icon
                      className={cn(
                        "h-3 w-3",
                        isCurrent ? "text-violet-400" : "text-slate-500",
                      )}
                    />
                  )}
                </div>

                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{step.id}</span>

                {idx < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "ml-1 h-px w-4 shrink-0 lg:w-6",
                      isCompleted ? "bg-emerald-500/30" : "bg-slate-800",
                    )}
                  />
                )}

                {isCurrent && (
                  <div className="absolute -bottom-3 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-violet-500" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
