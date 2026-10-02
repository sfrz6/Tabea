import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

/**
 * Generating a migration only reads the schema, so a connection string is not
 * required for that step. Commands that do reach the database, such as push,
 * studio and migrate, fail with a clear message instead of a driver error.
 */
const PLACEHOLDER = "postgresql://tabea:tabea@localhost:5432/tabea";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? PLACEHOLDER,
  },
  strict: true,
  verbose: true,
});
