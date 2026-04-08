const { z } = require("zod");

const createValuationSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200).optional(),
  }),
});

const updateStepSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    step: z.coerce.number().int().min(1).max(7),
  }),
  body: z.object({
    data: z.record(z.unknown()),
    markComplete: z.boolean().optional(),
  }),
});

const getValuationSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

const aiCompanyProfileSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    companyName: z.string().min(1).max(300),
    website: z.string().max(500).optional(),
    linkedin: z.string().max(500).optional(),
    description: z.string().max(2000).optional(),
  }),
});

const aiPeerFinderSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    industry: z.string().optional(),
    sector: z.string().optional(),
    country: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    topN: z.coerce.number().int().min(1).max(50).optional(),
  }),
});

const aiFinancialsSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    symbol: z.string().optional(),
    forecastYears: z.coerce.number().int().min(1).max(10).optional(),
  }),
});

const aiValuationSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    methodologies: z.array(z.string()).min(1),
  }),
});

module.exports = {
  createValuationSchema,
  updateStepSchema,
  getValuationSchema,
  aiCompanyProfileSchema,
  aiPeerFinderSchema,
  aiFinancialsSchema,
  aiValuationSchema,
};
