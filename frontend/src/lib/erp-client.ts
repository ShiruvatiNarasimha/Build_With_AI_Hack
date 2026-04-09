import { clientEnv } from "@/lib/env";

/* ─── Types ─── */

export interface ERPCountry {
  country: string;
  continent: string;
  countryRiskPremium: number;
  totalEquityRiskPremium: number;
}

export interface ErpAgentStep {
  id: string;
  name: string;
  icon: string;
  status: "pending" | "running" | "completed" | "error";
  description: string;
  startedAt?: number;
  completedAt?: number;
  duration?: number;
  detail?: string;
}

export interface ErpAnalysisResult {
  answer: string;
  orchestration: {
    countries: string[];
    context: string;
    focus: string[];
    intent: string;
    countriesMatched: number;
    totalInDataset: number;
  };
  timing?: {
    totalDuration: number;
    planningDuration: number;
    dataFetchDuration: number;
    researchDuration: number;
    synthesisDuration: number;
  };
}

export interface ErpAnalyzeParams {
  countries: string[];
  context: "pe" | "vc" | "ma" | "general";
  dealCountry?: string;
  targetCountry?: string;
  sector?: string;
  question?: string;
}

export interface ErpStreamCallbacks {
  onStep: (step: ErpAgentStep) => void;
  onComplete: (result: ErpAnalysisResult) => void;
  onError: (error: Error) => void;
}

interface ApiEnvelope<T> {
  data: T;
  message?: string;
  success: boolean;
}

/* ─── API Calls ─── */

export async function fetchERPData(
  accessToken: string,
): Promise<ERPCountry[]> {
  const res = await fetch(`${clientEnv.apiBaseUrl}/erp/data`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error("Failed to fetch ERP data.");

  const payload = (await res.json()) as ApiEnvelope<ERPCountry[]>;
  return payload.data ?? [];
}

export async function streamErpAnalysis(
  accessToken: string,
  params: ErpAnalyzeParams,
  callbacks: ErpStreamCallbacks,
): Promise<void> {
  const res = await fetch(`${clientEnv.apiBaseUrl}/erp/analyze`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "ERP analysis request failed.");
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No readable stream available.");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        if (!part.trim()) continue;

        const lines = part.split("\n");
        let eventType = "";
        let data = "";

        for (const line of lines) {
          if (line.startsWith("event: ")) eventType = line.slice(7).trim();
          else if (line.startsWith("data: ")) data = line.slice(6);
        }

        if (!eventType || !data) continue;

        try {
          const parsed = JSON.parse(data);
          switch (eventType) {
            case "step":
              callbacks.onStep(parsed as ErpAgentStep);
              break;
            case "complete":
              callbacks.onComplete(parsed as ErpAnalysisResult);
              break;
            case "error":
              callbacks.onError(
                new Error(parsed.message || "ERP stream error."),
              );
              break;
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
