"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Home } from "lucide-react";
import { toast } from "sonner";

import {
  getValuation,
  updateValuationStep,
  type AgentStep,
  type Valuation,
} from "@/lib/valuation-suite-client";
import { StepBar } from "./step-bar";
import { StepCompanyProfile } from "./steps/step-1-company-profile";
import { StepPeers } from "./steps/step-2-peers";
import { StepFinancials } from "./steps/step-3-financials";
import { StepCapTable } from "./steps/step-4-cap-table";
import { StepMethods } from "./steps/step-5-methods";
import { StepValuation } from "./steps/step-6-valuation";
import { StepResults } from "./steps/step-7-results";

interface ValuationWizardProps {
  valuation: Valuation;
  onUpdate: (v: Valuation) => void;
  accessToken: string;
}

export function ValuationWizard({
  valuation,
  onUpdate,
  accessToken,
}: ValuationWizardProps) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(valuation.currentStep);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const refreshValuation = useCallback(async () => {
    try {
      const updated = await getValuation(accessToken, valuation.id);
      onUpdate(updated);
    } catch {
      toast.error("Failed to refresh valuation data.");
    }
  }, [accessToken, valuation.id, onUpdate]);

  const handleStepClick = (step: number) => {
    if (!isProcessing) setActiveStep(step);
  };

  const handleNext = () => {
    if (activeStep < 7) setActiveStep(activeStep + 1);
  };

  const handlePrev = () => {
    if (activeStep > 1) setActiveStep(activeStep - 1);
  };

  const handleSaveStep = async (
    step: number,
    data: Record<string, unknown>,
    markComplete = false,
  ) => {
    try {
      const updated = await updateValuationStep(
        accessToken,
        valuation.id,
        step,
        data,
        markComplete,
      );
      onUpdate(updated);
      return updated;
    } catch {
      toast.error("Failed to save step data.");
      return null;
    }
  };

  const handleAgentStep = useCallback((step: AgentStep) => {
    setAgentSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === step.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...step };
        return updated;
      }
      return [...prev, step];
    });
  }, []);

  const clearAgentSteps = useCallback(() => setAgentSteps([]), []);

  const stepProps = {
    valuation,
    accessToken,
    onSave: handleSaveStep,
    onRefresh: refreshValuation,
    onNext: handleNext,
    agentSteps,
    onAgentStep: handleAgentStep,
    clearAgentSteps,
    isProcessing,
    setIsProcessing,
  };

  const renderStep = () => {
    switch (activeStep) {
      case 1:
        return <StepCompanyProfile {...stepProps} />;
      case 2:
        return <StepPeers {...stepProps} />;
      case 3:
        return <StepFinancials {...stepProps} />;
      case 4:
        return <StepCapTable {...stepProps} />;
      case 5:
        return <StepMethods {...stepProps} />;
      case 6:
        return <StepValuation {...stepProps} />;
      case 7:
        return <StepResults {...stepProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/valuation-suite")}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <Home className="h-3.5 w-3.5" />
            Hub
          </button>
          <div className="h-4 w-px bg-slate-800" />
          <h1 className="text-sm font-semibold text-white truncate max-w-xs">
            {valuation.name}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={activeStep === 1 || isProcessing}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Previous
          </button>
          <button
            onClick={handleNext}
            disabled={activeStep === 7 || isProcessing}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Step Bar */}
      <StepBar
        currentStep={activeStep}
        completedSteps={valuation.completedSteps}
        onStepClick={handleStepClick}
      />

      {/* Agent Progress */}
      {agentSteps.length > 0 && (
        <div className="border-b border-slate-800 bg-slate-900/50 px-4 py-3">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-center gap-2">
              {agentSteps.map((step) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                    step.status === "completed"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : step.status === "running"
                        ? "bg-blue-500/10 text-blue-400 animate-pulse"
                        : step.status === "error"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {step.status === "running" && (
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                  )}
                  {step.status === "completed" && (
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  )}
                  {step.name}
                  {step.duration != null && (
                    <span className="text-[10px] opacity-60">
                      {(step.duration / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-8">{renderStep()}</div>
      </div>
    </div>
  );
}
