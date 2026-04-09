import { clientEnv } from "@/lib/env";

/* ─── Types ─── */

export interface ForexPair {
  symbol: string;
  fromCurrency: string;
  toCurrency: string;
  fromName: string;
  toName: string;
}

export interface ForexHistoricalPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  changePercent: number;
  vwap: number;
}

export interface FxAgentStep {
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

export interface FxAnalysisResult {
  answer: string;
  orchestration: {
    pairs: string[];
    context: string;
    focus: string[];
    intent: string;
    timeHorizon: string;
    macroFactors: string[];
    fxPairsFetched: number;
  };
  timing?: {
    totalDuration: number;
    planningDuration: number;
    dataFetchDuration: number;
    researchDuration: number;
    synthesisDuration: number;
  };
}

export interface FxAnalyzeParams {
  pairs: string[];
  context: "pe" | "vc" | "ma" | "general";
  dealCurrency?: string;
  targetCurrency?: string;
  dealSize?: number;
  question?: string;
}

export interface FxStreamCallbacks {
  onStep: (step: FxAgentStep) => void;
  onComplete: (result: FxAnalysisResult) => void;
  onError: (error: Error) => void;
}

interface ApiEnvelope<T> {
  data: T;
  message?: string;
  success: boolean;
}

/* ─── API Calls ─── */

export async function fetchForexPairs(
  accessToken: string,
): Promise<ForexPair[]> {
  const res = await fetch(`${clientEnv.apiBaseUrl}/forex/pairs`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error("Failed to fetch forex pairs.");

  const payload = (await res.json()) as ApiEnvelope<ForexPair[]>;
  return payload.data ?? [];
}

export async function fetchForexHistorical(
  accessToken: string,
  symbol: string,
  from?: string,
  to?: string,
): Promise<ForexHistoricalPoint[]> {
  const params = new URLSearchParams({ symbol });
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const res = await fetch(
    `${clientEnv.apiBaseUrl}/forex/historical?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) throw new Error("Failed to fetch forex historical data.");

  const payload = (await res.json()) as ApiEnvelope<ForexHistoricalPoint[]>;
  return payload.data ?? [];
}

export async function streamFxAnalysis(
  accessToken: string,
  params: FxAnalyzeParams,
  callbacks: FxStreamCallbacks,
): Promise<void> {
  const res = await fetch(`${clientEnv.apiBaseUrl}/forex/analyze`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "FX analysis request failed.");
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
              callbacks.onStep(parsed as FxAgentStep);
              break;
            case "complete":
              callbacks.onComplete(parsed as FxAnalysisResult);
              break;
            case "error":
              callbacks.onError(new Error(parsed.message || "FX stream error."));
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
