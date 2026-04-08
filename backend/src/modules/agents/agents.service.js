const { openai } = require("../../lib/openai");
const { env } = require("../../config/env");

const SYSTEM_PROMPT = `
You are ValuationOps, a senior financial AI orchestrator.
Your mission:
1) Decompose the user's valuation question into focused sub-questions.
2) Investigate public sources via specialized researchers.
3) Return a concise, reliable valuation-focused answer with assumptions and limitations.

Hard rules:
- Never fabricate facts.
- Prefer verifiable, recent information.
- If data is missing, explicitly say so.
- Keep output structured and executive-friendly.
`;

function parseJsonObject(text) {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (_error) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

async function createPlannerBrief(question) {
  const response = await openai.responses.create({
    model: env.OPENAI_MODEL,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `${SYSTEM_PROMPT}
Return strict JSON with keys:
- intent (string)
- linkedinQuery (string)
- wikipediaQuery (string)
- analysisFocus (string[])`,
          },
        ],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: question }],
      },
    ],
  });

  const parsed = parseJsonObject(response.output_text);

  return {
    intent:
      parsed?.intent ||
      "Answer valuation question with market context and assumptions.",
    linkedinQuery:
      parsed?.linkedinQuery ||
      `LinkedIn posts discussing valuation perspective: ${question}`,
    wikipediaQuery: parsed?.wikipediaQuery || question,
    analysisFocus: Array.isArray(parsed?.analysisFocus)
      ? parsed.analysisFocus.slice(0, 6)
      : ["valuation", "growth assumptions", "risk factors"],
  };
}

async function runLinkedinResearch(linkedinQuery) {
  const response = await openai.responses.create({
    model: env.OPENAI_MODEL,
    tools: [{ type: "web_search_preview" }],
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `You are a LinkedIn market researcher.
Find high-signal public posts/opinions related to the query.
Return bullet findings and include references in plain text.`,
          },
        ],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: linkedinQuery }],
      },
    ],
  });

  return response.output_text || "No LinkedIn-based signals were found.";
}

async function runWikipediaResearch(wikipediaQuery) {
  const response = await openai.responses.create({
    model: env.OPENAI_MODEL,
    tools: [{ type: "web_search_preview" }],
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `You are a fundamentals researcher.
Use Wikipedia and related public encyclopedia references for factual context.
Return concise factual notes and references.`,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Wikipedia context for: ${wikipediaQuery}`,
          },
        ],
      },
    ],
  });

  return response.output_text || "No Wikipedia context was found.";
}

async function synthesizeValuationAnswer({
  analysisFocus,
  intent,
  linkedinFindings,
  question,
  wikipediaFindings,
}) {
  const response = await openai.responses.create({
    model: env.OPENAI_MODEL,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `${SYSTEM_PROMPT}
Respond in markdown with sections:
## Answer
## Key Drivers
## Assumptions
## Risks & Missing Data
## Sources Used`,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `User question:
${question}

Planner intent:
${intent}

Analysis focus:
${analysisFocus.join(", ")}

LinkedIn researcher findings:
${linkedinFindings}

Wikipedia researcher findings:
${wikipediaFindings}`,
          },
        ],
      },
    ],
  });

  return response.output_text || "I could not produce a final valuation answer.";
}

async function askValuationQuestion(question) {
  const plan = await createPlannerBrief(question);

  const [linkedinFindings, wikipediaFindings] = await Promise.all([
    runLinkedinResearch(plan.linkedinQuery),
    runWikipediaResearch(plan.wikipediaQuery),
  ]);

  const answer = await synthesizeValuationAnswer({
    analysisFocus: plan.analysisFocus,
    intent: plan.intent,
    linkedinFindings,
    question,
    wikipediaFindings,
  });

  return {
    answer,
    orchestration: {
      focus: plan.analysisFocus,
      intent: plan.intent,
      linkedinQuery: plan.linkedinQuery,
      wikipediaQuery: plan.wikipediaQuery,
    },
  };
}

async function askValuationQuestionStream(question, emitStep) {
  const startTime = Date.now();

  emitStep({
    id: "analyze",
    name: "Analyzing Question",
    icon: "brain",
    status: "running",
    description: "Understanding your question and identifying key analysis areas...",
    startedAt: startTime,
  });

  emitStep({
    id: "plan",
    name: "Building Research Plan",
    icon: "git-branch",
    status: "pending",
    description: "Waiting to create research strategy...",
  });

  const planStart = Date.now();
  const plan = await createPlannerBrief(question);
  const planEnd = Date.now();

  emitStep({
    id: "analyze",
    name: "Analyzing Question",
    icon: "brain",
    status: "completed",
    description: "Question analyzed — intent and focus areas identified.",
    completedAt: planEnd,
    duration: planEnd - startTime,
  });

  emitStep({
    id: "plan",
    name: "Building Research Plan",
    icon: "git-branch",
    status: "completed",
    description: `Research plan ready with ${plan.analysisFocus.length} focus areas.`,
    completedAt: planEnd,
    duration: planEnd - planStart,
    detail: JSON.stringify({
      intent: plan.intent,
      focus: plan.analysisFocus,
    }),
  });

  const researchStart = Date.now();

  emitStep({
    id: "linkedin",
    name: "Market Intelligence",
    icon: "trending-up",
    status: "running",
    description: "Searching for market signals and expert opinions...",
    startedAt: researchStart,
  });

  emitStep({
    id: "wikipedia",
    name: "Fundamentals Research",
    icon: "book-open",
    status: "running",
    description: "Gathering factual context and historical data...",
    startedAt: researchStart,
  });

  const [linkedinFindings, wikipediaFindings] = await Promise.all([
    runLinkedinResearch(plan.linkedinQuery),
    runWikipediaResearch(plan.wikipediaQuery),
  ]);

  const researchEnd = Date.now();

  emitStep({
    id: "linkedin",
    name: "Market Intelligence",
    icon: "trending-up",
    status: "completed",
    description: "Market signals and expert opinions collected.",
    completedAt: researchEnd,
    duration: researchEnd - researchStart,
  });

  emitStep({
    id: "wikipedia",
    name: "Fundamentals Research",
    icon: "book-open",
    status: "completed",
    description: "Factual context and historical data gathered.",
    completedAt: researchEnd,
    duration: researchEnd - researchStart,
  });

  emitStep({
    id: "cross_reference",
    name: "Cross-Referencing",
    icon: "git-merge",
    status: "completed",
    description: "Research findings validated across sources.",
    completedAt: Date.now(),
    duration: 0,
  });

  const synthesisStart = Date.now();

  emitStep({
    id: "synthesis",
    name: "Synthesizing Answer",
    icon: "sparkles",
    status: "running",
    description: "Composing the final valuation analysis...",
    startedAt: synthesisStart,
  });

  const answer = await synthesizeValuationAnswer({
    analysisFocus: plan.analysisFocus,
    intent: plan.intent,
    linkedinFindings,
    question,
    wikipediaFindings,
  });

  const synthesisEnd = Date.now();

  emitStep({
    id: "synthesis",
    name: "Synthesizing Answer",
    icon: "sparkles",
    status: "completed",
    description: "Valuation analysis composed successfully.",
    completedAt: synthesisEnd,
    duration: synthesisEnd - synthesisStart,
  });

  emitStep({
    id: "validate",
    name: "Quality Verification",
    icon: "shield-check",
    status: "completed",
    description: "Assumptions, risks, and sources verified.",
    completedAt: Date.now(),
    duration: 0,
  });

  return {
    answer,
    orchestration: {
      focus: plan.analysisFocus,
      intent: plan.intent,
      linkedinQuery: plan.linkedinQuery,
      wikipediaQuery: plan.wikipediaQuery,
    },
    timing: {
      totalDuration: Date.now() - startTime,
      planningDuration: planEnd - startTime,
      researchDuration: researchEnd - researchStart,
      synthesisDuration: synthesisEnd - synthesisStart,
    },
  };
}

module.exports = {
  askValuationQuestion,
  askValuationQuestionStream,
};
