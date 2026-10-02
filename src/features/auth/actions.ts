"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  fakeVerifyPassword,
  verifyPassword,
} from "@/lib/auth/password";
import {
  checkLoginRateLimit,
  clearLoginAttempts,
  pruneLoginAttempts,
  recordLoginAttempt,
} from "@/lib/auth/rate-limit";
import {
  createSession,
  destroySession,
  pruneExpiredSessions,
  writeLocaleCookie,
} from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/current-user";
import { actionError, actionOk, type ActionResult } from "@/lib/errors";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { loginSchema, toFieldErrors } from "@/lib/validation/schemas";
import { recordSuccessfulLogin } from "@/features/users/mutations";

export type LoginState = ActionResult<undefined>;

/**
 * Sign in. Every failure path returns the same message and takes a comparable
 * amount of time, so the form cannot be used to discover which usernames exist
 * or which accounts are deactivated.
 */
export async function loginAction(
  _previous: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return actionError("VALIDATION", { fieldErrors: toFieldErrors(parsed.error) });
  }

  const identifier = parsed.data.username.toLowerCase();

  const limit = await checkLoginRateLimit(identifier);
  if (limit.blocked) {
    return actionError("RATE_LIMITED", {
      message: String(limit.retryAfterMinutes),
    });
  }

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.username, identifier))
    .limit(1);

  const user = rows[0];

  if (!user) {
    await fakeVerifyPassword();
    await recordLoginAttempt(identifier, false);
    return actionError("VALIDATION", { fieldErrors: { form: "invalidCredentials" } });
  }

  const correct = await verifyPassword(parsed.data.password, user.passwordHash);

  if (!correct || !user.isActive) {
    await recordLoginAttempt(identifier, false);
    return actionError("VALIDATION", { fieldErrors: { form: "invalidCredentials" } });
  }

  const userAgent = (await headers()).get("user-agent");

  await createSession(user.id, userAgent);
  await writeLocaleCookie(user.preferredLanguage);
  await recordSuccessfulLogin(user.id);
  await clearLoginAttempts(identifier);

  // Cheap housekeeping on a path that already writes, so V1 needs no cron job.
  await Promise.all([pruneExpiredSessions(), pruneLoginAttempts()]);

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

/**
 * Language switch. Signed in users have the choice saved to their account so it
 * follows them to another device; signed out visitors keep it in the cookie.
 */
export async function setLocaleAction(locale: string): Promise<ActionResult<undefined>> {
  if (!isLocale(locale)) return actionError("VALIDATION");

  const next: Locale = locale;
  await writeLocaleCookie(next);

  const user = await getCurrentUser();
  if (user) {
    await db
      .update(users)
      .set({ preferredLanguage: next, updatedAt: new Date() })
      .where(eq(users.id, user.id));
  }

  return actionOk();
}
