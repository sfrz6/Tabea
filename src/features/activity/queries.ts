import "server-only";
import { and, count, desc, eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { taskActivities, tasks, users, type ActivityAction } from "@/db/schema";
import type { Actor } from "@/lib/permissions";
import { visibilityCondition } from "@/features/tasks/queries";

export const ACTIVITY_PAGE_SIZE = 40;

export type ActivityEntryRow = {
  id: string;
  taskId: string;
  taskTitle: string;
  action: ActivityAction;
  oldValue: string | null;
  newValue: string | null;
  note: string | null;
  createdAt: Date;
  actorName: string;
};

export type ActivityPage = {
  items: ActivityEntryRow[];
  total: number;
  page: number;
  pageCount: number;
};

/**
 * The history across every task the reader is allowed to see, newest first.
 *
 * It reuses the same visibility condition as the task lists, so somebody
 * restricted to their own work never reads a line about a task they cannot
 * open. An administrator has full visibility by definition, which is why this
 * one page serves them as well and there is no separate unfiltered log.
 */
export async function listActivity(
  actor: Actor,
  page = 1,
): Promise<ActivityPage> {
  const visibility: SQL | undefined = visibilityCondition(actor);

  const totalRows = await db
    .select({ value: count() })
    .from(taskActivities)
    .innerJoin(tasks, eq(tasks.id, taskActivities.taskId))
    .where(visibility);

  const total = totalRows[0]?.value ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / ACTIVITY_PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pageCount);

  const items = await db
    .select({
      id: taskActivities.id,
      taskId: taskActivities.taskId,
      taskTitle: tasks.title,
      action: taskActivities.action,
      oldValue: taskActivities.oldValue,
      newValue: taskActivities.newValue,
      note: taskActivities.note,
      createdAt: taskActivities.createdAt,
      actorName: users.name,
    })
    .from(taskActivities)
    .innerJoin(tasks, eq(tasks.id, taskActivities.taskId))
    .innerJoin(users, eq(users.id, taskActivities.actorId))
    .where(visibility)
    .orderBy(desc(taskActivities.createdAt))
    .limit(ACTIVITY_PAGE_SIZE)
    .offset((current - 1) * ACTIVITY_PAGE_SIZE);

  return { items, total, page: current, pageCount };
}

/** Narrower view used where only one person's actions matter. */
export async function listActivityByActor(
  actor: Actor,
  actorId: string,
  limit = 40,
): Promise<ActivityEntryRow[]> {
  const visibility = visibilityCondition(actor);
  const conditions = [visibility, eq(taskActivities.actorId, actorId)].filter(
    (part): part is SQL => part !== undefined,
  );

  return db
    .select({
      id: taskActivities.id,
      taskId: taskActivities.taskId,
      taskTitle: tasks.title,
      action: taskActivities.action,
      oldValue: taskActivities.oldValue,
      newValue: taskActivities.newValue,
      note: taskActivities.note,
      createdAt: taskActivities.createdAt,
      actorName: users.name,
    })
    .from(taskActivities)
    .innerJoin(tasks, eq(tasks.id, taskActivities.taskId))
    .innerJoin(users, eq(users.id, taskActivities.actorId))
    .where(and(...conditions))
    .orderBy(desc(taskActivities.createdAt))
    .limit(limit);
}
