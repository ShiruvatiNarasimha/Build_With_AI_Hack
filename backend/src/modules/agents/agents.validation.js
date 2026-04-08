const { z } = require("zod");

const askValuationSchema = z.object({
  body: z.object({
    question: z.string().min(8).max(4000),
  }),
});

module.exports = {
  askValuationSchema,
};
