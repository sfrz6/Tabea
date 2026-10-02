import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import type { Actor } from "@/lib/permissions";
import { assertCanManageUsers } from "@/lib/permissions";
import { readSession, type SessionUser } from "./session";

/**
 * Memoized for the duration of a request, so a page that checks the user in a
 * layout, a page component and a server action still performs one lookup.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  return readSession();
});

/** For pages: sends anonymous visitors to the sign in screen. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For server actions and route handlers: throws instead of redirecting. */
export async function requireUserOrThrow(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AppError("FORBIDDEN_ADMIN");
  return user;
}

export async function requireAdminOrThrow(): Promise<SessionUser> {
  const user = await requireUserOrThrow();
  assertCanManageUsers(toActor(user));
  return user;
}

/** Narrows a session user to the fields authorization is allowed to depend on. */
export function toActor(user: SessionUser): Actor {
  return {
    id: user.id,
    role: user.role,
    canViewAllTasks: user.canViewAllTasks,
    canAssignTasks: user.canAssignTasks,
    canEditOthersTasks: user.canEditOthersTasks,
    isActive: user.isActive,
  };
}

/** Convenience for pages that need both the user and the derived actor. */
export async function requireActor(): Promise<{ user: SessionUser; actor: Actor }> {
  const user = await requireUser();
  return { user, actor: toActor(user) };
}

export async function requireActorOrThrow(): Promise<{ user: SessionUser; actor: Actor }> {
  const user = await requireUserOrThrow();
  return { user, actor: toActor(user) };
}
