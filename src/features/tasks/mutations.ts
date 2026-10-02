import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  projects,
  taskParticipants,
  taskUpdateRevisions,
  taskUpdates,
  tasks,
  users,
  type ActivityAction,
  type NotificationType,
  type TaskStatus,
} from "@/db/schema";
import { AppError } from "@/lib/errors";
import { fromDateInputValue } from "@/lib/dates";
import {
  assertCanAddUpdate,
  assertCanCancelTask,
  assertCanChangeStatus,
  assertCanCreateTasks,
  assertCanEditTask,
  assertCanReopenTask,
  assertCanViewTask,
  canAssignToOthers,
  canEditOwnUpdate,
  isClosed,
  type Actor,
} from "@/lib/permissions";
import { recordActivity, type ActivityEntry } from "@/services/activity";
import { notificationService, type NotificationEvent } from "@/services/notification";
import type {
  AddUpdateInput,
  ChangeStatusInput,
  CreateTaskInput,
  EditTaskInput,
} from "@/lib/validation/schemas";

/* -------------------------------------------------------------------------- */
/*                              Shared internals                              */
/* -------------------------------------------------------------------------- */

type TaskRow = typeof tasks.$inferSelect;

async function loadTask(taskId: string): Promise<TaskRow> {
  const rows = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  const row = rows[0];
  if (!row) throw new AppError("TASK_NOT_FOUND");
  return row;
}

async function loadParticipantIds(taskId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: taskParticipants.userId })
    .from(taskParticipants)
    .where(eq(taskParticipants.taskId, taskId));
  return rows.map((row) => row.userId);
}

async function requireActiveUser(userId: string): Promise<{ id: string; name: string }> {
  const rows = await db
    .select({ id: users.id, name: users.name, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const row = rows[0];
  if (!row) throw new AppError("USER_NOT_FOUND");
  if (!row.isActive) throw new AppError("USER_INACTIVE");
  return { id: row.id, name: row.name };
}

/**
 * Resolves a project or category identifier to its name, so the history reads
 * as a sentence rather than storing an identifier nobody can interpret later.
 */
async function taxonomyName(
  kind: "project" | "category",
  id: string | null,
): Promise<string | null> {
  if (!id) return null;
  const table = kind === "project" ? projects : categories;
  const rows = await db
    .select({ name: table.name })
    .from(table)
    .where(eq(table.id, id))
    .limit(1);
  return rows[0]?.name ?? null;
}

async function namesOf(userIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(userIds)].filter(Boolean);
  if (unique.length === 0) return new Map();
  const rows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, unique));
  return new Map(rows.map((row) => [row.id, row.name]));
}

/**
 * Who hears about a change: the person responsible, the person who raised the
 * work and anybody explicitly brought in. The actor is never notified about
 * their own action, and inactive accounts are skipped.
 */
async function audienceFor(
  task: Pick<TaskRow, "assignedToId" | "createdById" | "id">,
  actorId: string,
  extraRecipients: string[] = [],
): Promise<string[]> {
  const participantIds = await loadParticipantIds(task.id);
  const candidates = new Set<string>([
    task.assignedToId,
    task.createdById,
    ...participantIds,
    ...extraRecipients,
  ]);
  candidates.delete(actorId);
  if (candidates.size === 0) return [];

  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.id, [...candidates]), eq(users.isActive, true)));

  return rows.map((row) => row.id);
}

function buildEvents(
  recipients: string[],
  base: Omit<NotificationEvent, "recipientId">,
): NotificationEvent[] {
  return recipients.map((recipientId) => ({ ...base, recipientId }));
}

function notificationKeys(type: NotificationType) {
  return { titleKey: `title_${type}`, bodyKey: `body_${type}` };
}

/** Values stored in the history for a date, so the timeline can format them. */
function isoOrNull(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

/* -------------------------------------------------------------------------- */
/*                                Create task                                 */
/* -------------------------------------------------------------------------- */

export type CreateTaskResult = { taskId: string };

export async function createTask(
  actor: Actor,
  input: CreateTaskInput,
  actorName: string,
): Promise<CreateTaskResult> {
  assertCanCreateTasks(actor);

  // Assigning work to somebody else is a separate right from creating work.
  if (input.assignedToId !== actor.id && !canAssignToOthers(actor)) {
    throw new AppError("FORBIDDEN_ASSIGN");
  }

  const assignee = await requireActiveUser(input.assignedToId);

  const dueDate = fromDateInputValue(input.dueDate, input.dueTime ?? null);
  if (!dueDate) throw new AppError("VALIDATION", "dueDateInvalid");

  const participantIds = (input.participantIds ?? []).filter(
    (id) => id !== input.assignedToId && id !== actor.id,
  );

  const taskId = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(tasks)
      .values({
        title: input.title,
        description: input.description ?? null,
        priority: input.priority,
        status: "NEW",
        createdById: actor.id,
        assignedById: actor.id,
        assignedToId: input.assignedToId,
        dueDate,
        projectId: input.projectId ?? null,
        categoryId: input.categoryId ?? null,
        location: input.location ?? null,
      })
      .returning({ id: tasks.id });

    const created = inserted[0];
    if (!created) throw new AppError("UNEXPECTED");

    if (participantIds.length > 0) {
      await tx
        .insert(taskParticipants)
        .values(participantIds.map((userId) => ({ taskId: created.id, userId })));
    }

    const entries: ActivityEntry[] = [
      { taskId: created.id, actorId: actor.id, action: "TASK_CREATED" },
      {
        taskId: created.id,
        actorId: actor.id,
        action: "TASK_ASSIGNED",
        newValue: assignee.name,
      },
    ];

    if (participantIds.length > 0) {
      const names = await namesOf(participantIds);
      for (const userId of participantIds) {
        entries.push({
          taskId: created.id,
          actorId: actor.id,
          action: "PARTICIPANT_ADDED",
          newValue: names.get(userId) ?? "",
        });
      }
    }

    await recordActivity(tx, entries);

    const recipients = [...new Set([input.assignedToId, ...participantIds])].filter(
      (id) => id !== actor.id,
    );

    await notificationService.dispatch(
      buildEvents(recipients, {
        type: "TASK_ASSIGNED",
        ...notificationKeys("TASK_ASSIGNED"),
        vars: {
          actor: actorName,
          task: input.title,
          due: dueDate.toISOString(),
        },
        taskId: created.id,
        actorId: actor.id,
      }),
      tx,
    );

    return created.id;
  });

  return { taskId };
}

/* -------------------------------------------------------------------------- */
/*                                 Edit task                                  */
/* -------------------------------------------------------------------------- */

/**
 * Applies an edit and records one history entry per field that actually
 * changed. Nothing is overwritten silently: an old due date, an old priority or
 * a previous assignee is always preserved in the timeline.
 */
export async function editTask(
  actor: Actor,
  input: EditTaskInput,
  actorName: string,
): Promise<void> {
  const task = await loadTask(input.taskId);
  const participantIds = await loadParticipantIds(task.id);
  assertCanEditTask(actor, { ...task, participantIds });

  const dueDate = fromDateInputValue(input.dueDate, input.dueTime ?? null);
  if (!dueDate) throw new AppError("VALIDATION", "dueDateInvalid");

  const reassigned = input.assignedToId !== task.assignedToId;
  if (reassigned && !canAssignToOthers(actor)) throw new AppError("FORBIDDEN_ASSIGN");
  if (reassigned) await requireActiveUser(input.assignedToId);

  const nextParticipants = [...new Set(input.participantIds ?? [])].filter(
    (id) => id !== input.assignedToId,
  );
  const addedParticipants = nextParticipants.filter((id) => !participantIds.includes(id));
  const removedParticipants = participantIds.filter((id) => !nextParticipants.includes(id));

  const names = await namesOf([
    task.assignedToId,
    input.assignedToId,
    ...addedParticipants,
    ...removedParticipants,
  ]);

  const entries: ActivityEntry[] = [];
  const events: NotificationEvent[] = [];
  const now = new Date();

  const push = (
    action: ActivityAction,
    oldValue: string | null,
    newValue: string | null,
  ): void => {
    entries.push({ taskId: task.id, actorId: actor.id, action, oldValue, newValue });
  };

  if (input.title !== task.title) push("TITLE_CHANGED", task.title, input.title);

  const nextDescription = input.description ?? null;
  if (nextDescription !== task.description) {
    push("DESCRIPTION_CHANGED", task.description, nextDescription);
  }

  if (input.priority !== task.priority) {
    push("PRIORITY_CHANGED", task.priority, input.priority);
  }

  if (dueDate.getTime() !== task.dueDate.getTime()) {
    push("DUE_DATE_CHANGED", isoOrNull(task.dueDate), isoOrNull(dueDate));
  }

  const nextProjectId = input.projectId ?? null;
  if (nextProjectId !== task.projectId) {
    push(
      "PROJECT_CHANGED",
      await taxonomyName("project", task.projectId),
      await taxonomyName("project", nextProjectId),
    );
  }

  const nextCategoryId = input.categoryId ?? null;
  if (nextCategoryId !== task.categoryId) {
    push(
      "CATEGORY_CHANGED",
      await taxonomyName("category", task.categoryId),
      await taxonomyName("category", nextCategoryId),
    );
  }

  const nextLocation = input.location ?? null;
  if (nextLocation !== task.location) {
    push("LOCATION_CHANGED", task.location, nextLocation);
  }

  if (reassigned) {
    push(
      "TASK_REASSIGNED",
      names.get(task.assignedToId) ?? null,
      names.get(input.assignedToId) ?? null,
    );
  }

  for (const userId of addedParticipants) {
    push("PARTICIPANT_ADDED", null, names.get(userId) ?? null);
  }
  for (const userId of removedParticipants) {
    push("PARTICIPANT_REMOVED", names.get(userId) ?? null, null);
  }

  if (entries.length === 0) return;

  const audience = await audienceFor(task, actor.id, [input.assignedToId]);

  if (reassigned) {
    events.push(
      ...buildEvents(audience, {
        type: "TASK_REASSIGNED",
        ...notificationKeys("TASK_REASSIGNED"),
        vars: {
          actor: actorName,
          task: input.title,
          assignee: names.get(input.assignedToId) ?? "",
        },
        taskId: task.id,
        actorId: actor.id,
      }),
    );
  }

  if (dueDate.getTime() !== task.dueDate.getTime()) {
    events.push(
      ...buildEvents(audience, {
        type: "TASK_DUE_DATE_CHANGED",
        ...notificationKeys("TASK_DUE_DATE_CHANGED"),
        vars: { actor: actorName, task: input.title, due: dueDate.toISOString() },
        taskId: task.id,
        actorId: actor.id,
      }),
    );
  }

  if (input.priority !== task.priority) {
    events.push(
      ...buildEvents(audience, {
        type: "TASK_PRIORITY_CHANGED",
        ...notificationKeys("TASK_PRIORITY_CHANGED"),
        vars: { actor: actorName, task: input.title, priority: input.priority },
        taskId: task.id,
        actorId: actor.id,
      }),
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(tasks)
      .set({
        title: input.title,
        description: nextDescription,
        priority: input.priority,
        assignedToId: input.assignedToId,
        assignedById: reassigned ? actor.id : task.assignedById,
        dueDate,
        projectId: nextProjectId,
        categoryId: nextCategoryId,
        location: nextLocation,
        updatedAt: now,
      })
      .where(eq(tasks.id, task.id));

    if (removedParticipants.length > 0) {
      await tx
        .delete(taskParticipants)
        .where(
          and(
            eq(taskParticipants.taskId, task.id),
            inArray(taskParticipants.userId, removedParticipants),
          ),
        );
    }

    if (addedParticipants.length > 0) {
      await tx
        .insert(taskParticipants)
        .values(addedParticipants.map((userId) => ({ taskId: task.id, userId })))
        .onConflictDoNothing();
    }

    await recordActivity(tx, entries);
    await notificationService.dispatch(events, tx);
  });

  await notificationService.dispatchExternal(events, db);
}

/* -------------------------------------------------------------------------- */
/*                               Change status                                */
/* -------------------------------------------------------------------------- */

/**
 * The single place a task status changes. It owns the side effects that make
 * the history trustworthy: the first move into In progress stamps startedAt,
 * Waiting demands a reason, Completed stamps who finished it and when, and
 * leaving a finished state is recorded as a reopen rather than a quiet edit.
 */
export async function changeTaskStatus(
  actor: Actor,
  input: ChangeStatusInput,
  actorName: string,
  now: Date = new Date(),
): Promise<void> {
  const task = await loadTask(input.taskId);
  const participantIds = await loadParticipantIds(task.id);
  const subject = { ...task, participantIds };

  const target: TaskStatus = input.status;
  if (target === task.status && target !== "WAITING") return;

  if (target === "CANCELLED") {
    assertCanCancelTask(actor, subject);
  } else if (isClosed(task.status)) {
    assertCanReopenTask(actor, subject);
  } else {
    assertCanChangeStatus(actor, subject);
  }

  if (target === "WAITING" && !input.waitingReason) {
    throw new AppError("VALIDATION", "waitingReasonRequired");
  }

  const wasClosed = isClosed(task.status);
  const entries: ActivityEntry[] = [];

  const changes: Partial<TaskRow> = {
    status: target,
    updatedAt: now,
  };

  // Starting work is stamped once, the first time it genuinely starts.
  if (target === "IN_PROGRESS" && !task.startedAt) changes.startedAt = now;

  if (target === "WAITING") {
    changes.waitingReason = input.waitingReason;
  } else {
    changes.waitingReason = null;
  }

  if (target === "COMPLETED") {
    changes.completedAt = now;
    changes.completedById = actor.id;
    changes.cancelledAt = null;
    changes.cancelledById = null;
  } else if (target === "CANCELLED") {
    changes.cancelledAt = now;
    changes.cancelledById = actor.id;
    changes.completedAt = null;
    changes.completedById = null;
  } else {
    changes.completedAt = null;
    changes.completedById = null;
    changes.cancelledAt = null;
    changes.cancelledById = null;
  }

  if (wasClosed && !isClosed(target)) {
    entries.push({
      taskId: task.id,
      actorId: actor.id,
      action: "TASK_REOPENED",
      oldValue: task.status,
      newValue: target,
      note: isoOrNull(task.completedAt ?? task.cancelledAt),
    });
  }

  if (target !== task.status) {
    entries.push({
      taskId: task.id,
      actorId: actor.id,
      action: "STATUS_CHANGED",
      oldValue: task.status,
      newValue: target,
      note: target === "WAITING" ? (input.waitingReason ?? null) : null,
    });
  }

  if (target === "WAITING" && input.waitingReason !== task.waitingReason) {
    entries.push({
      taskId: task.id,
      actorId: actor.id,
      action: "WAITING_REASON_SET",
      oldValue: task.waitingReason,
      newValue: input.waitingReason ?? null,
    });
  }

  if (target === "COMPLETED") {
    entries.push({ taskId: task.id, actorId: actor.id, action: "TASK_COMPLETED" });
  }

  if (target === "CANCELLED") {
    entries.push({
      taskId: task.id,
      actorId: actor.id,
      action: "TASK_CANCELLED",
      note: input.waitingReason ?? null,
    });
  }

  const audience = await audienceFor(task, actor.id);

  const notificationType: NotificationType =
    target === "COMPLETED"
      ? "TASK_COMPLETED"
      : target === "CANCELLED"
        ? "TASK_CANCELLED"
        : wasClosed
          ? "TASK_REOPENED"
          : "TASK_STATUS_CHANGED";

  const events = buildEvents(audience, {
    type: notificationType,
    ...notificationKeys(notificationType),
    vars: {
      actor: actorName,
      task: task.title,
      status: target,
      reason: input.waitingReason ?? "",
    },
    taskId: task.id,
    actorId: actor.id,
  });

  await db.transaction(async (tx) => {
    await tx.update(tasks).set(changes).where(eq(tasks.id, task.id));
    await recordActivity(tx, entries);
    await notificationService.dispatch(events, tx);
  });

  await notificationService.dispatchExternal(events, db);
}

/* -------------------------------------------------------------------------- */
/*                              Progress updates                              */
/* -------------------------------------------------------------------------- */

/**
 * Progress updates are independent of status, so somebody can report what they
 * did without pretending the work moved on. They are never removed when the
 * status later changes.
 */
export async function addTaskUpdate(
  actor: Actor,
  input: AddUpdateInput,
  actorName: string,
): Promise<void> {
  const task = await loadTask(input.taskId);
  const participantIds = await loadParticipantIds(task.id);
  assertCanAddUpdate(actor, { ...task, participantIds });

  const audience = await audienceFor(task, actor.id);
  const events = buildEvents(audience, {
    type: "TASK_UPDATED",
    ...notificationKeys("TASK_UPDATED"),
    vars: { actor: actorName, task: task.title },
    taskId: task.id,
    actorId: actor.id,
  });

  await db.transaction(async (tx) => {
    await tx.insert(taskUpdates).values({
      taskId: task.id,
      authorId: actor.id,
      content: input.content,
    });

    await tx.update(tasks).set({ updatedAt: new Date() }).where(eq(tasks.id, task.id));

    await recordActivity(tx, {
      taskId: task.id,
      actorId: actor.id,
      action: "UPDATE_ADDED",
    });

    await notificationService.dispatch(events, tx);
  });

  await notificationService.dispatchExternal(events, db);
}

/**
 * Corrects the wording of a recent update. The previous text is kept and the
 * entry is marked as edited, so a record can be fixed but not rewritten.
 */
export async function editTaskUpdate(
  actor: Actor,
  input: { updateId: string; content: string },
  now: Date = new Date(),
): Promise<void> {
  const rows = await db
    .select()
    .from(taskUpdates)
    .where(eq(taskUpdates.id, input.updateId))
    .limit(1);

  const update = rows[0];
  if (!update) throw new AppError("NOT_FOUND");

  const task = await loadTask(update.taskId);
  const participantIds = await loadParticipantIds(task.id);
  assertCanViewTask(actor, { ...task, participantIds });

  if (!canEditOwnUpdate(actor, update, now)) throw new AppError("FORBIDDEN_EDIT");
  if (update.content === input.content) return;

  await db.transaction(async (tx) => {
    await tx.insert(taskUpdateRevisions).values({
      updateId: update.id,
      previousContent: update.content,
      editedById: actor.id,
    });

    await tx
      .update(taskUpdates)
      .set({ content: input.content, editedAt: now })
      .where(eq(taskUpdates.id, update.id));

    await recordActivity(tx, {
      taskId: task.id,
      actorId: actor.id,
      action: "UPDATE_EDITED",
    });
  });
}

/* -------------------------------------------------------------------------- */
/*                         Convenience task operations                        */
/* -------------------------------------------------------------------------- */

export async function completeTask(
  actor: Actor,
  taskId: string,
  actorName: string,
): Promise<void> {
  await changeTaskStatus(actor, { taskId, status: "COMPLETED", waitingReason: null }, actorName);
}

export async function reopenTask(
  actor: Actor,
  taskId: string,
  actorName: string,
): Promise<void> {
  await changeTaskStatus(
    actor,
    { taskId, status: "IN_PROGRESS", waitingReason: null },
    actorName,
  );
}

/**
 * Cancelling reuses the status change path. The reason travels in the same
 * field as a waiting reason, because both answer the one question the father
 * will ask: why is this not being done.
 */
export async function cancelTask(
  actor: Actor,
  taskId: string,
  reason: string | null,
  actorName: string,
): Promise<void> {
  await changeTaskStatus(
    actor,
    { taskId, status: "CANCELLED", waitingReason: reason },
    actorName,
  );
}
