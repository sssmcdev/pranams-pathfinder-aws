import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Introspection/migrations are one-off developer tasks, not serverless
    // traffic — point them at the SESSION-mode pooler (port 5432), which
    // supports the prepared statements and catalog queries drizzle-kit
    // needs. The transaction pooler (6543) does not. See .env.example.
    url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
  },
  // The tables already exist and hold live data. Never let drizzle-kit
  // push a schema it inferred — generate a reviewed migration instead.
  strict: true,
  verbose: true,
});
