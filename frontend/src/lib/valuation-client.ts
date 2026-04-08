import { clientEnv } from "@/lib/env";

interface ApiEnvelope<T> {
  data: T;
  details?: unknown;
  message?: string;
  success: boolean;
}

export interface AgentStep {
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

export interface ValuationAgentResponse {
  answer: string;
  orchestration: {
    focus: string[];
    intent: string;
    linkedinQuery: string;
    wikipediaQuery: string;
  };
}

export interface ValuationStreamResult extends ValuationAgentResponse {
  timing?: {
    totalDuration: number;
    planningDuration: number;
    researchDuration: number;
    synthesisDuration: number;
  };
}

export interface StreamCallbacks {
  onStep: (step: AgentStep) => void;
  onComplete: (result: ValuationStreamResult) => void;
  onError: (error: Error) => void;
}

export class ValuationApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ValuationApiError";
    this.status = status;
    this.details = details;
  }
}

export async function askValuationAgent({
  accessToken,
  question,
}: {
  accessToken: string;
  question: string;
}) {
  const response = await fetch(`${clientEnv.apiBaseUrl}/agents/valuation`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });

  const payload = (await response
    .json()
    .catch(() => null)) as ApiEnvelope<ValuationAgentResponse> | null;

  if (!response.ok) {
    throw new ValuationApiError(
      payload?.message || "Valuation agent request failed.",
      response.status,
      payload?.details,
    );
  }

  return payload?.data as ValuationAgentResponse;
}

export async function streamValuationAgent(
  {
    accessToken,
    question,
  }: {
    accessToken: string;
    question: string;
  },
  callbacks: StreamCallbacks,
): Promise<void> {
  const response = await fetch(
    `${clientEnv.apiBaseUrl}/agents/valuation/stream`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question }),
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ValuationApiError(
      text || "Streaming request failed.",
      response.status,
    );
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new ValuationApiError("No readable stream available.", 500);
  }

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
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            data = line.slice(6);
          }
        }

        if (!eventType || !data) continue;

        try {
          const parsed = JSON.parse(data);

          switch (eventType) {
            case "step":
              callbacks.onStep(parsed as AgentStep);
              break;
            case "complete":
              callbacks.onComplete(parsed as ValuationStreamResult);
              break;
            case "error":
              callbacks.onError(
                new Error(parsed.message || "Stream error occurred."),
              );
              break;
          }
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
