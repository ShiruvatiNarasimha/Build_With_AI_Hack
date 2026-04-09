const { z } = require("zod");

const erpAnalyzeSchema = z.object({
  body: z.object({
    countries: z.array(z.string().min(1).max(100)).min(1).max(20),
    context: z.enum(["pe", "vc", "ma", "general"]).default("general"),
    dealCountry: z.string().max(100).optional(),
    targetCountry: z.string().max(100).optional(),
    sector: z.string().max(200).optional(),
    question: z.string().max(2000).optional(),
  }),
});

module.exports = {
  erpAnalyzeSchema,
};
