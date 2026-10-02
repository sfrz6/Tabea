"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActorOrThrow } from "@/lib/auth/current-user";
import {
  actionError,
  actionOk,
  toActionResult,
  type ActionResult,
} from "@/lib/errors";
import {
  addUpdateSchema,
  cancelTaskSchema,
  changeStatusSchema,
  completeTaskSchema,
  createTaskSchema,
  editTaskSchema,
  editUpdateSchema,
  reopenTaskSchema,
  toFieldErrors,
} from "@/lib/validation/schemas";
import {
  addTaskUpdate,
  cancelTask,
  changeTaskStatus,
  completeTask,
  createTask,
  editTask,
  editTaskUpdate,
  reopenTask,
} from "./mutations";

/**
 * Server actions are the only way the browser reaches task logic. Each one
 * re-reads the session, re-validates the payload and lets the mutation layer
 * repeat the authorization check. Nothing here trusts a hidden field, an
 * identifier supplied by the page, or a permission the interface appeared to
 * grant by showing a button.
 *
 * Redirects happen after the try block, because next/navigation signals a
 * redirect by throwing and a catch must not treat that as a failure.
 */

function readOptional(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function readParticipants(formData: FormData): string[] {
  return formData
    .getAll("participantIds")
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

function revalidateTaskViews(taskId?: string): void {
  if (taskId) revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/my-tasks");
  revalidatePath("/notifications");
}

/* -------------------------------------------------------------------------- */
/*                                   Create                                   */
/* -------------------------------------------------------------------------- */

export type TaskFormState = ActionResult<{ taskId: string }>;

export async function createTaskAction(
  _previous: TaskFormState | undefined,
  formData: FormData,
): Promise<TaskFormState> {
  let createdId: string | null = null;

  try {
    const { user, actor } = await requireActorOrThrow();

    const parsed = createTaskSchema.safeParse({
      title: formData.get("title") ?? "",
      description: formData.get("description") ?? "",
      assignedToId: formData.get("assignedToId") ?? "",
      priority: formData.get("priority") ?? "",
      dueDate: formData.get("dueDate") ?? "",
      dueTime: formData.get("dueTime") ?? "",
      projectId: readOptional(formData, "projectId") ?? null,
      categoryId: readOptional(formData, "categoryId") ?? null,
      location: formData.get("location") ?? "",
      participantIds: readParticipants(formData),
    });

    if (!parsed.success) {
      return actionError("VALIDATION", { fieldErrors: toFieldErrors(parsed.error) });
    }

    const result = await createTask(actor, parsed.data, user.name);
    createdId = result.taskId;
    revalidateTaskViews(createdId);
  } catch (error) {
    return toActionResult(error);
  }

  redirect(`/tasks/${createdId}`);
}

/* -------------------------------------------------------------------------- */
/*                                    Edit                                    */
/* -------------------------------------------------------------------------- */

export async function editTaskAction(
  _previous: TaskFormState | undefined,
  formData: FormData,
): Promise<TaskFormState> {
  let editedId: string | null = null;

  try {
    const { user, actor } = await requireActorOrThrow();

    const parsed = editTaskSchema.safeParse({
      taskId: formData.get("taskId") ?? "",
      title: formData.get("title") ?? "",
      description: formData.get("description") ?? "",
      assignedToId: formData.get("assignedToId") ?? "",
      priority: formData.get("priority") ?? "",
      dueDate: formData.get("dueDate") ?? "",
      dueTime: formData.get("dueTime") ?? "",
      projectId: readOptional(formData, "projectId") ?? null,
      categoryId: readOptional(formData, "categoryId") ?? null,
      location: formData.get("location") ?? "",
      participantIds: readParticipants(formData),
    });

    if (!parsed.success) {
      return actionError("VALIDATION", { fieldErrors: toFieldErrors(parsed.error) });
    }

    await editTask(actor, parsed.data, user.name);
    editedId = parsed.data.taskId;
    revalidateTaskViews(editedId);
  } catch (error) {
    return toActionResult(error);
  }

  redirect(`/tasks/${editedId}`);
}

/* -------------------------------------------------------------------------- */
/*                                   Status                                   */
/* -------------------------------------------------------------------------- */

export type StatusFormState = ActionResult<undefined>;

export async function changeStatusAction(
  _previous: StatusFormState | undefined,
  formData: FormData,
): Promise<StatusFormState> {
  try {
    const { user, actor } = await requireActorOrThrow();

    const parsed = changeStatusSchema.safeParse({
      taskId: formData.get("taskId") ?? "",
      status: formData.get("status") ?? "",
      waitingReason: formData.get("waitingReason") ?? "",
    });

    if (!parsed.success) {
      return actionError("VALIDATION", { fieldErrors: toFieldErrors(parsed.error) });
    }

    await changeTaskStatus(actor, parsed.data, user.name);
    revalidateTaskViews(parsed.data.taskId);

    return actionOk();
  } catch (error) {
    return toActionResult(error);
  }
}

export async function completeTaskAction(
  _previous: StatusFormState | undefined,
  formData: FormData,
): Promise<StatusFormState> {
  try {
    const { user, actor } = await requireActorOrThrow();

    const parsed = completeTaskSchema.safeParse({
      taskId: formData.get("taskId") ?? "",
      note: formData.get("note") ?? "",
    });

    if (!parsed.success) {
      return actionError("VALIDATION", { fieldErrors: toFieldErrors(parsed.error) });
    }

    // An optional closing note is recorded as a normal progress update, so it
    // stays in the conversation instead of being buried in the history.
    if (parsed.data.note) {
      await addTaskUpdate(
        actor,
        { taskId: parsed.data.taskId, content: parsed.data.note },
        user.name,
      );
    }

    await completeTask(actor, parsed.data.taskId, user.name);
    revalidateTaskViews(parsed.data.taskId);

    return actionOk();
  } catch (error) {
    return toActionResult(error);
  }
}

export async function reopenTaskAction(
  _previous: StatusFormState | undefined,
  formData: FormData,
): Promise<StatusFormState> {
  try {
    const { user, actor } = await requireActorOrThrow();

    const parsed = reopenTaskSchema.safeParse({ taskId: formData.get("taskId") ?? "" });
    if (!parsed.success) {
      return actionError("VALIDATION", { fieldErrors: toFieldErrors(parsed.error) });
    }

    await reopenTask(actor, parsed.data.taskId, user.name);
    revalidateTaskViews(parsed.data.taskId);

    return actionOk();
  } catch (error) {
    return toActionResult(error);
  }
}

export async function cancelTaskAction(
  _previous: StatusFormState | undefined,
  formData: FormData,
): Promise<StatusFormState> {
  try {
    const { user, actor } = await requireActorOrThrow();

    const parsed = cancelTaskSchema.safeParse({
      taskId: formData.get("taskId") ?? "",
      reason: formData.get("reason") ?? "",
    });

    if (!parsed.success) {
      return actionError("VALIDATION", { fieldErrors: toFieldErrors(parsed.error) });
    }

    await cancelTask(actor, parsed.data.taskId, parsed.data.reason ?? null, user.name);
    revalidateTaskViews(parsed.data.taskId);

    return actionOk();
  } catch (error) {
    return toActionResult(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                              Progress updates                              */
/* -------------------------------------------------------------------------- */

export async function addUpdateAction(
  _previous: StatusFormState | undefined,
  formData: FormData,
): Promise<StatusFormState> {
  try {
    const { user, actor } = await requireActorOrThrow();

    const parsed = addUpdateSchema.safeParse({
      taskId: formData.get("taskId") ?? "",
      content: formData.get("content") ?? "",
    });

    if (!parsed.success) {
      return actionError("VALIDATION", { fieldErrors: toFieldErrors(parsed.error) });
    }

    await addTaskUpdate(actor, parsed.data, user.name);
    revalidateTaskViews(parsed.data.taskId);

    return actionOk();
  } catch (error) {
    return toActionResult(error);
  }
}

export async function editUpdateAction(
  _previous: StatusFormState | undefined,
  formData: FormData,
): Promise<StatusFormState> {
  try {
    const { actor } = await requireActorOrThrow();

    const parsed = editUpdateSchema.safeParse({
      updateId: formData.get("updateId") ?? "",
      content: formData.get("content") ?? "",
    });

    if (!parsed.success) {
      return actionError("VALIDATION", { fieldErrors: toFieldErrors(parsed.error) });
    }

    await editTaskUpdate(actor, parsed.data);
    revalidateTaskViews(readOptional(formData, "taskId"));

    return actionOk();
  } catch (error) {
    return toActionResult(error);
  }
}
