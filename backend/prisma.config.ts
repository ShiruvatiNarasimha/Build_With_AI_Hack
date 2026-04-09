import "dotenv/config";
import { defineConfig } from "prisma/config";

// `prisma generate` never connects; allow CI/install without a real DB URL.
const isPrismaGenerate = process.argv.includes("generate");

const prismaDatasourceUrl =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  (isPrismaGenerate
    ? "postgresql://postgres:postgres@127.0.0.1:5432/postgres?schema=public"
    : undefined);

if (!prismaDatasourceUrl) {
  throw new Error(
    "Prisma datasource URL is missing. Set DIRECT_URL or DATABASE_URL in backend/.env.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: prismaDatasourceUrl,
  },
});
