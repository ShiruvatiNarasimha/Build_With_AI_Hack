const { z } = require("zod");

const forexHistoricalSchema = z.object({
  query: z.object({
    symbol: z.string().min(3).max(20),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
});

const forexAnalyzeSchema = z.object({
  body: z.object({
    pairs: z.array(z.string().min(3).max(20)).min(1).max(10),
    context: z
      .enum(["pe", "vc", "ma", "general"])
      .default("general"),
    dealCurrency: z.string().min(3).max(3).optional(),
    targetCurrency: z.string().min(3).max(3).optional(),
    dealSize: z.number().positive().optional(),
    question: z.string().max(2000).optional(),
  }),
});

module.exports = {
  forexHistoricalSchema,
  forexAnalyzeSchema,
};
