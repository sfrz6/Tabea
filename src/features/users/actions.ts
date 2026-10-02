"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActorOrThrow } from "@/lib/auth/current-user";
import { destroyOtherSessions, writeLocaleCookie } from "@/lib/auth/session";
import {
  actionError,
  actionOk,
  isAppError,
  toActionResult,
  type ActionResult,
} from "@/lib/errors";
import { assertCanManageUsers } from "@/lib/permissions";
import {
  changePasswordSchema,
  createUserSchema,
  editUserSchema,
  resetUserPasswordSchema,
  setUserActiveSchema,
  toFieldErrors,
  updateProfileSchema,
} from "@/lib/validation/schemas";
import {
  changeOwnPassword,
  createUser,
  editUser,
  resetUserPassword,
  setUserActive,
  updateOwnProfile,
} from "./mutations";

export type UserFormState = ActionResult<undefined>;

/**
 * Account management. Every action in this file begins by asserting the ADMIN
 * role through the shared permission check, which is the only place that right
 * is defined. There is no stored permission for managing users and no way to
 * delegate it.
 */

function readBoolean(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Turns a domain conflict, such as a taken username, into a field error. */
function conflictToFieldError(error: unknown, field: string): ActionResult<never> | null {
  if (isAppError(error) && error.code === "CONFLICT") {
    return actionError("CONFLICT", { fieldErrors: { [field]: error.message } });
  }
  return null;
}

function userPayload(formData: FormData) {
  return {
    name: readText(formData, "name"),
    username: readText(formData, "username"),
    email: readText(formData, "email"),
    phoneNumber: readText(formData, "phoneNumber"),
    role: readText(formData, "role"),
    canViewAllTasks: readBoolean(formData, "canViewAllTasks"),
    canAssignTasks: readBoolean(formData, "canAssignTasks"),
    canEditOthersTasks: readBoolean(formData, "canEditOthersTasks"),
    preferredLanguage: readText(formData, "preferredLanguage") || "en",
    isActive: readBoolean(formData, "isActive"),
  };
}

/* -------------------------------------------------------------------------- */
/*                               Create and edit                              */
/* -------------------------------------------------------------------------- */

export async function createUserAction(
  _previous: UserFormState | undefined,
  formData: FormData,
): Promise<UserFormState> {
  try {
    const { actor } = await requireActorOrThrow();
    assertCanManageUsers(actor);

    const parsed = createUserSchema.safeParse({
      ...userPayload(formData),
      password: readText(formData, "password"),
    });

    if (!parsed.success) {
      return actionError("VALIDATION", { fieldErrors: toFieldErrors(parsed.error) });
    }

    await createUser(actor, parsed.data);
    revalidatePath("/admin/users");
  } catch (error) {
    const conflict = conflictToFieldError(error, "username");
    if (conflict) return conflict;
    return toActionResult(error);
  }

  redirect("/admin/users");
}

export async function editUserAction(
  _previous: UserFormState | undefined,
  formData: FormData,
): Promise<UserFormState> {
  try {
    const { actor } = await requireActorOrThrow();
    assertCanManageUsers(actor);

    const parsed = editUserSchema.safeParse({
      userId: readText(formData, "userId"),
      ...userPayload(formData),
    });

    if (!parsed.success) {
      return actionError("VALIDATION", { fieldErrors: toFieldErrors(parsed.error) });
    }

    await editUser(actor, parsed.data);
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${parsed.data.userId}`);
  } catch (error) {
    if (isAppError(error) && error.code === "CONFLICT") {
      const field = error.message === "usernameTaken" ? "username" : "form";
      return actionError("CONFLICT", { fieldErrors: { [field]: error.message } });
    }
    return toActionResult(error);
  }

  redirect("/admin/users");
}

/* -------------------------------------------------------------------------- */
/*                        Activation and password reset                       */
/* -------------------------------------------------------------------------- */

export async function setUserActiveAction(
  _previous: UserFormState | undefined,
  formData: FormData,
): Promise<UserFormState> {
  try {
    const { actor } = await requireActorOrThrow();
    assertCanManageUsers(actor);

    const parsed = setUserActiveSchema.safeParse({
      userId: readText(formData, "userId"),
      isActive: readBoolean(formData, "isActive"),
    });

    if (!parsed.success) {
      return actionError("VALIDATION", { fieldErrors: toFieldErrors(parsed.error) });
    }

    await setUserActive(actor, parsed.data);

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${parsed.data.userId}`);

    return actionOk();
  } catch (error) {
    if (isAppError(error) && error.code === "CONFLICT") {
      return actionError("CONFLICT", { fieldErrors: { form: error.message } });
    }
    return toActionResult(error);
  }
}

export async function resetUserPasswordAction(
  _previous: UserFormState | undefined,
  formData: FormData,
): Promise<UserFormState> {
  try {
    const { actor } = await requireActorOrThrow();
    assertCanManageUsers(actor);

    const parsed = resetUserPasswordSchema.safeParse({
      userId: readText(formData, "userId"),
      password: readText(formData, "password"),
      confirmPassword: readText(formData, "confirmPassword"),
    });

    if (!parsed.success) {
      return actionError("VALIDATION", { fieldErrors: toFieldErrors(parsed.error) });
    }

    await resetUserPassword(actor, parsed.data);
    revalidatePath(`/admin/users/${parsed.data.userId}`);

    return actionOk();
  } catch (error) {
    return toActionResult(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Profile                                  */
/* -------------------------------------------------------------------------- */

/**
 * A person may edit their own contact details and language, and nothing else.
 * Role, visibility and task rights are never read from this payload, so posting
 * extra fields to it achieves nothing.
 */
export async function updateProfileAction(
  _previous: UserFormState | undefined,
  formData: FormData,
): Promise<UserFormState> {
  try {
    const { user } = await requireActorOrThrow();

    const parsed = updateProfileSchema.safeParse({
      name: readText(formData, "name"),
      email: readText(formData, "email"),
      phoneNumber: readText(formData, "phoneNumber"),
      preferredLanguage: readText(formData, "preferredLanguage") || user.preferredLanguage,
    });

    if (!parsed.success) {
      return actionError("VALIDATION", { fieldErrors: toFieldErrors(parsed.error) });
    }

    await updateOwnProfile(user.id, parsed.data);
    await writeLocaleCookie(parsed.data.preferredLanguage);

    revalidatePath("/profile");

    return actionOk();
  } catch (error) {
    return toActionResult(error);
  }
}

export async function changePasswordAction(
  _previous: UserFormState | undefined,
  formData: FormData,
): Promise<UserFormState> {
  try {
    const { user } = await requireActorOrThrow();

    const parsed = changePasswordSchema.safeParse({
      currentPassword: readText(formData, "currentPassword"),
      newPassword: readText(formData, "newPassword"),
      confirmPassword: readText(formData, "confirmPassword"),
    });

    if (!parsed.success) {
      return actionError("VALIDATION", { fieldErrors: toFieldErrors(parsed.error) });
    }

    await changeOwnPassword(user.id, parsed.data);

    return actionOk();
  } catch (error) {
    if (isAppError(error) && error.code === "VALIDATION") {
      return actionError("VALIDATION", {
        fieldErrors: { currentPassword: error.message },
      });
    }
    return toActionResult(error);
  }
}

export async function signOutOtherDevicesAction(): Promise<UserFormState> {
  try {
    const { user } = await requireActorOrThrow();
    await destroyOtherSessions(user.id);
    return actionOk();
  } catch (error) {
    return toActionResult(error);
  }
}
