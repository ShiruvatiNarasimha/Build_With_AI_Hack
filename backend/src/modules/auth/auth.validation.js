const { z } = require("zod");

const googleAuthSchema = z.object({
  body: z.object({
    idToken: z.string().min(1, "Google ID token is required."),
  }),
});

module.exports = { googleAuthSchema };
