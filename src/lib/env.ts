import { z } from "zod";

/**
 * Server environment. Parsed once, lazily, so that build steps which do not
 * touch the database are not forced to provide a connection string.
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  SESSION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  APP_TIMEZONE: z.string().min(1).default("Asia/Muscat"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    APP_URL: process.env.APP_URL,
    SESSION_DAYS: process.env.SESSION_DAYS,
    APP_TIMEZONE: process.env.APP_TIMEZONE,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(
      `Invalid environment configuration. ${details}. Copy .env.example to .env.local and fill in the values.`,
    );
  }

  cached = parsed.data;
  return cached;
}

/** Timezone used for every user facing date, independent of server locale. */
export const APP_TIMEZONE = process.env.APP_TIMEZONE?.trim() || "Asia/Muscat";

export const isProduction = process.env.NODE_ENV === "production";
