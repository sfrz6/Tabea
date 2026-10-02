import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { destroyAllSessionsFor, destroyOtherSessions } from "@/lib/auth/session";
import { assertCanManageUsers, type Actor } from "@/lib/permissions";
import type {
  CreateUserInput,
  EditUserInput,
} from "@/lib/validation/schemas";
import { countActiveAdmins, isUsernameTaken } from "./queries";

/**
 * Administrators always hold full visibility and full task rights. Storing them
 * explicitly keeps the stored record honest, so an export or an audit of the
 * users table reads the same as the behaviour in the product.
 */
function normalizePermissions<T extends Pick<
  CreateUserInput,
  "role" | "canViewAllTasks" | "canAssignTasks" | "canEditOthersTasks"
>>(input: T): T {
  if (input.role !== "ADMIN") return input;
  return {
    ...input,
    canViewAllTasks: true,
    canAssignTasks: true,
    canEditOthersTasks: true,
  };
}

export async function createUser(
  actor: Actor,
  input: CreateUserInput,
): Promise<{ userId: string }> {
  assertCanManageUsers(actor);

  if (await isUsernameTaken(input.username)) {
    throw new AppError("CONFLICT", "usernameTaken");
  }

  const values = normalizePermissions(input);
  const passwordHash = await hashPassword(input.password);

  const inserted = await db
    .insert(users)
    .values({
      name: values.name,
      username: values.username,
      passwordHash,
      email: values.email ?? null,
      phoneNumber: values.phoneNumber ?? null,
      role: values.role,
      canViewAllTasks: values.canViewAllTasks,
      canAssignTasks: values.canAssignTasks,
      canEditOthersTasks: values.canEditOthersTasks,
      preferredLanguage: values.preferredLanguage,
      isActive: values.isActive,
    })
    .returning({ id: users.id });

  const created = inserted[0];
  if (!created) throw new AppError("UNEXPECTED");
  return { userId: created.id };
}

export async function editUser(actor: Actor, input: EditUserInput): Promise<void> {
  assertCanManageUsers(actor);

  const rows = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
  const target = rows[0];
  if (!target) throw new AppError("USER_NOT_FOUND");

  if (await isUsernameTaken(input.username, input.userId)) {
    throw new AppError("CONFLICT", "usernameTaken");
  }

  // An administrator cannot quietly demote themselves out of the only admin seat.
  if (target.id === actor.id && input.role !== target.role) {
    throw new AppError("CONFLICT", "cannotChangeOwnRole");
  }

  const losesAdmin = target.role === "ADMIN" && input.role !== "ADMIN";
  const losesAccess = target.isActive && !input.isActive;
  if ((losesAdmin || (target.role === "ADMIN" && losesAccess)) &&
      (await countActiveAdmins(target.id)) === 0) {
    throw new AppError("CONFLICT", "lastAdminProtected");
  }

  if (target.id === actor.id && !input.isActive) {
    throw new AppError("CONFLICT", "cannotDeactivateSelf");
  }

  const values = normalizePermissions(input);

  await db
    .update(users)
    .set({
      name: values.name,
      username: values.username,
      email: values.email ?? null,
      phoneNumber: values.phoneNumber ?? null,
      role: values.role,
      canViewAllTasks: values.canViewAllTasks,
      canAssignTasks: values.canAssignTasks,
      canEditOthersTasks: values.canEditOthersTasks,
      preferredLanguage: values.preferredLanguage,
      isActive: values.isActive,
      updatedAt: new Date(),
    })
    .where(eq(users.id, input.userId));

  // Reduced rights or a blocked account must take effect at once, not at the
  // next sign in, so every existing session for that person is ended.
  const rightsReduced =
    (target.canViewAllTasks && !values.canViewAllTasks) ||
    (target.canAssignTasks && !values.canAssignTasks) ||
    (target.canEditOthersTasks && !values.canEditOthersTasks) ||
    target.role !== values.role;

  if (!values.isActive || rightsReduced) {
    await destroyAllSessionsFor(input.userId);
  }
}

/**
 * Deactivation rather than deletion. Historical tasks, updates and activity
 * keep pointing at the account, so the record of who was responsible stays
 * intact and their name still reads correctly in old entries.
 */
export async function setUserActive(
  actor: Actor,
  input: { userId: string; isActive: boolean },
): Promise<void> {
  assertCanManageUsers(actor);

  if (input.userId === actor.id && !input.isActive) {
    throw new AppError("CONFLICT", "cannotDeactivateSelf");
  }

  const rows = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
  const target = rows[0];
  if (!target) throw new AppError("USER_NOT_FOUND");

  if (
    !input.isActive &&
    target.role === "ADMIN" &&
    (await countActiveAdmins(target.id)) === 0
  ) {
    throw new AppError("CONFLICT", "lastAdminProtected");
  }

  await db
    .update(users)
    .set({ isActive: input.isActive, updatedAt: new Date() })
    .where(eq(users.id, input.userId));

  if (!input.isActive) {
    await destroyAllSessionsFor(input.userId);
  }
}

export async function resetUserPassword(
  actor: Actor,
  input: { userId: string; password: string },
): Promise<void> {
  assertCanManageUsers(actor);

  const passwordHash = await hashPassword(input.password);
  const result = await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, input.userId))
    .returning({ id: users.id });

  if (result.length === 0) throw new AppError("USER_NOT_FOUND");

  // A password reset invalidates whatever sessions were open with the old one.
  await destroyAllSessionsFor(input.userId);
}

/* -------------------------------------------------------------------------- */
/*                                  Profile                                   */
/* -------------------------------------------------------------------------- */

/**
 * A person edits only their own contact details and language. Role, visibility
 * and task rights are absent from this path on purpose: they belong to the
 * administrator and cannot be reached from the profile page or by posting extra
 * fields to it.
 */
export async function updateOwnProfile(
  userId: string,
  input: {
    name: string;
    email?: string | null;
    phoneNumber?: string | null;
    preferredLanguage: "en" | "ar";
  },
): Promise<void> {
  await db
    .update(users)
    .set({
      name: input.name,
      email: input.email ?? null,
      phoneNumber: input.phoneNumber ?? null,
      preferredLanguage: input.preferredLanguage,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function changeOwnPassword(
  userId: string,
  input: { currentPassword: string; newPassword: string },
): Promise<void> {
  const rows = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const row = rows[0];
  if (!row) throw new AppError("USER_NOT_FOUND");

  const correct = await verifyPassword(input.currentPassword, row.passwordHash);
  if (!correct) throw new AppError("VALIDATION", "currentPasswordWrong");

  const passwordHash = await hashPassword(input.newPassword);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));

  // Other devices are signed out, the current one stays signed in.
  await destroyOtherSessions(userId);
}

export async function recordSuccessfulLogin(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, userId));
}
