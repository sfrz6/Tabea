import "server-only";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { loginAttempts } from "@/db/schema";

/** Failures allowed inside the window before sign in is blocked for that username. */
export const MAX_FAILED_ATTEMPTS = 8;

/** Length of the sliding window, in minutes. */
export const ATTEMPT_WINDOW_MINUTES = 15;

function windowStart(now: Date): Date {
  return new Date(now.getTime() - ATTEMPT_WINDOW_MINUTES * 60_000);
}

export type RateLimitState = {
  blocked: boolean;
  retryAfterMinutes: number;
};

/**
 * Counts recent failures for a username. The identifier is the typed username,
 * not a user id, so attempts against accounts that do not exist are limited in
 * exactly the same way and reveal nothing about which usernames are real.
 */
export async function checkLoginRateLimit(
  identifier: string,
  now: Date = new Date(),
): Promise<RateLimitState> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.identifier, identifier),
        eq(loginAttempts.successful, false),
        gte(loginAttempts.createdAt, windowStart(now)),
      ),
    );

  const failures = rows[0]?.count ?? 0;
  return {
    blocked: failures >= MAX_FAILED_ATTEMPTS,
    retryAfterMinutes: ATTEMPT_WINDOW_MINUTES,
  };
}

export async function recordLoginAttempt(
  identifier: string,
  successful: boolean,
): Promise<void> {
  await db.insert(loginAttempts).values({ identifier, successful });
}

/** Clears the window for a username after a correct sign in. */
export async function clearLoginAttempts(identifier: string): Promise<void> {
  await db.delete(loginAttempts).where(eq(loginAttempts.identifier, identifier));
}

/**
 * Drops rows older than a day. Called after a successful sign in so the table
 * stays small without needing a scheduled job, which V1 deliberately avoids.
 */
export async function pruneLoginAttempts(now: Date = new Date()): Promise<void> {
  await db
    .delete(loginAttempts)
    .where(lt(loginAttempts.createdAt, new Date(now.getTime() - 24 * 60 * 60_000)));
}
