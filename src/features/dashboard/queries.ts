import "server-only";
import { and, gte, inArray, lt, lte, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { addDays, endOfZonedDay, startOfNextZonedDay, startOfZonedDay } from "@/lib/dates";
import { visibilityScope, type Actor } from "@/lib/permissions";
import {
  CLOSED_STATUSES,
  OPEN_STATUSES,
  listTasksForDashboard,
  priorityRank,
  visibilityCondition,
  type TaskListItem,
} from "@/features/tasks/queries";

export type DashboardMetrics = {
  open: number;
  inProgress: number;
  waiting: number;
  overdue: number;
  dueToday: number;
  completedThisWeek: number;
};

export type DashboardData = {
  metrics: DashboardMetrics;
  scope: "ALL" | "OWN";
  needsAttention: TaskListItem[];
  dueToday: TaskListItem[];
  upcoming: TaskListItem[];
  recentlyUpdated: TaskListItem[];
};

/**
 * One grouped query for every dashboard number. Counting in the database and
 * reusing the same visibility condition means a person restricted to their own
 * work sees figures calculated only from the tasks they are allowed to see.
 */
async function loadMetrics(actor: Actor, now: Date): Promise<DashboardMetrics> {
  const visibility = visibilityCondition(actor);
  const todayStart = startOfZonedDay(now);
  const todayEnd = endOfZonedDay(now);
  const weekStart = startOfZonedDay(addDays(now, -7));

  const rows = await db
    .select({
      open: sql<number>`count(*) filter (where ${tasks.status} in ('NEW', 'IN_PROGRESS', 'WAITING'))::int`,
      inProgress: sql<number>`count(*) filter (where ${tasks.status} = 'IN_PROGRESS')::int`,
      waiting: sql<number>`count(*) filter (where ${tasks.status} = 'WAITING')::int`,
      overdue: sql<number>`count(*) filter (where ${tasks.dueDate} < ${now} and ${tasks.status} not in ('COMPLETED', 'CANCELLED'))::int`,
      dueToday: sql<number>`count(*) filter (where ${tasks.dueDate} between ${todayStart} and ${todayEnd} and ${tasks.status} not in ('COMPLETED', 'CANCELLED'))::int`,
      completedThisWeek: sql<number>`count(*) filter (where ${tasks.status} = 'COMPLETED' and ${tasks.completedAt} >= ${weekStart})::int`,
    })
    .from(tasks)
    .where(visibility);

  return (
    rows[0] ?? {
      open: 0,
      inProgress: 0,
      waiting: 0,
      overdue: 0,
      dueToday: 0,
      completedThisWeek: 0,
    }
  );
}

export async function getDashboardData(
  actor: Actor,
  now: Date = new Date(),
): Promise<DashboardData> {
  const tomorrowStart = startOfNextZonedDay(now);
  const horizon = startOfZonedDay(addDays(now, 8));

  const [metrics, needsAttention, dueToday, upcoming, recentlyUpdated] =
    await Promise.all([
      loadMetrics(actor, now),

      // Overdue first, then blocked work, because both need a decision.
      listTasksForDashboard(actor, {
        condition: and(
          notInArray(tasks.status, CLOSED_STATUSES),
          sql`(${tasks.dueDate} < ${now} or ${tasks.status} = 'WAITING')`,
        ),
        order: [
          sql`case when ${tasks.dueDate} < ${now} then 0 else 1 end asc`,
          sql`${priorityRank} asc`,
          sql`${tasks.dueDate} asc`,
        ],
        limit: 6,
      }),

      listTasksForDashboard(actor, {
        condition: and(
          gte(tasks.dueDate, startOfZonedDay(now)),
          lte(tasks.dueDate, endOfZonedDay(now)),
          notInArray(tasks.status, CLOSED_STATUSES),
        ),
        order: [sql`${priorityRank} asc`, sql`${tasks.dueDate} asc`],
        limit: 6,
      }),

      listTasksForDashboard(actor, {
        condition: and(
          gte(tasks.dueDate, tomorrowStart),
          lt(tasks.dueDate, horizon),
          notInArray(tasks.status, CLOSED_STATUSES),
        ),
        order: [sql`${tasks.dueDate} asc`, sql`${priorityRank} asc`],
        limit: 6,
      }),

      listTasksForDashboard(actor, {
        condition: inArray(tasks.status, OPEN_STATUSES),
        order: [sql`${tasks.updatedAt} desc`],
        limit: 5,
      }),
    ]);

  return {
    metrics,
    scope: visibilityScope(actor),
    needsAttention,
    dueToday,
    upcoming,
    recentlyUpdated,
  };
}
