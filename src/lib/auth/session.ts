import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { isProduction, serverEnv } from "@/lib/env";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "@/lib/i18n/config";

export const SESSION_COOKIE = "tabea_session";

/** 256 bits of entropy in the cookie token. */
const TOKEN_BYTES = 32;

/**
 * The session identifier stored in the database is an HMAC of the cookie token
 * keyed with AUTH_SECRET. Reading the database alone therefore does not yield a
 * usable session, and the raw token never leaves the browser.
 */
function tokenFingerprint(token: string): string {
  return createHmac("sha256", serverEnv().AUTH_SECRET).update(token).digest("hex");
}

function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

function sessionLifetimeMs(): number {
  return serverEnv().SESSION_DAYS * 24 * 60 * 60 * 1000;
}

export type SessionUser = Omit<User, "passwordHash">;

function stripSecret(user: User): SessionUser {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

/* -------------------------------------------------------------------------- */
/*                              Session lifecycle                             */
/* -------------------------------------------------------------------------- */

export async function createSession(userId: string, userAgent?: string | null): Promise<void> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + sessionLifetimeMs());

  await db.insert(sessions).values({
    id: tokenFingerprint(token),
    userId,
    expiresAt,
    userAgent: userAgent?.slice(0, 300) ?? null,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/**
 * Loads the signed in user, or null. Inactive accounts are rejected and their
 * session is removed, so deactivating somebody takes effect immediately rather
 * than at the next sign in.
 */
export async function readSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const fingerprint = tokenFingerprint(token);

  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, fingerprint))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  if (row.session.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, fingerprint));
    return null;
  }

  if (!row.user.isActive) {
    await db.delete(sessions).where(eq(sessions.userId, row.user.id));
    return null;
  }

  return stripSecret(row.user);
}

/** Ends the current session and clears the cookie. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.id, tokenFingerprint(token)));
  }
  store.delete(SESSION_COOKIE);
}

/** Ends every session except the current one. Used by "sign out of all devices". */
export async function destroyOtherSessions(userId: string): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const keep = token ? tokenFingerprint(token) : null;

  await db
    .delete(sessions)
    .where(
      keep
        ? and(eq(sessions.userId, userId), ne(sessions.id, keep))
        : eq(sessions.userId, userId),
    );
}

/** Removes every session for a user. Used when an account is deactivated. */
export async function destroyAllSessionsFor(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** Opportunistic cleanup of expired rows. Cheap, indexed and safe to call often. */
export async function pruneExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

/* -------------------------------------------------------------------------- */
/*                              Language cookie                               */
/* -------------------------------------------------------------------------- */

/** Mirrors the saved language preference into the cookie that pages read. */
export async function writeLocaleCookie(locale: string): Promise<void> {
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
  });
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

/** Constant time comparison for any future token checks outside bcrypt. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
