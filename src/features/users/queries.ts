import "server-only";
import { and, asc, count, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  taskActivities,
  tasks,
  users,
  type ActivityAction,
  type Language,
  type UserRole,
} from "@/db/schema";
import { AppError } from "@/lib/errors";

export type AdminUserRow = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  phoneNumber: string | null;
  role: UserRole;
  canViewAllTasks: boolean;
  canAssignTasks: boolean;
  canEditOthersTasks: boolean;
  preferredLanguage: Language;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  openTasks: number;
  overdueTasks: number;
};

/**
 * The admin user list, with the two numbers that matter when deciding whether
 * somebody is carrying too much: how much open work they hold and how much of
 * it has already slipped.
 */
export async function listUsersForAdmin(now: Date = new Date()): Promise<AdminUserRow[]> {
  const openCounts = db
    .select({
      assignedToId: tasks.assignedToId,
      openTasks: sql<number>`count(*)::int`.as("open_tasks"),
      overdueTasks:
        sql<number>`count(*) filter (where ${tasks.dueDate} < ${now})::int`.as(
          "overdue_tasks",
        ),
    })
    .from(tasks)
    .where(notInArray(tasks.status, ["COMPLETED", "CANCELLED"]))
    .groupBy(tasks.assignedToId)
    .as("open_counts");

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      phoneNumber: users.phoneNumber,
      role: users.role,
      canViewAllTasks: users.canViewAllTasks,
      canAssignTasks: users.canAssignTasks,
      canEditOthersTasks: users.canEditOthersTasks,
      preferredLanguage: users.preferredLanguage,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      openTasks: openCounts.openTasks,
      overdueTasks: openCounts.overdueTasks,
    })
    .from(users)
    .leftJoin(openCounts, eq(openCounts.assignedToId, users.id))
    .orderBy(desc(users.isActive), asc(users.name));

  return rows.map((row) => ({
    ...row,
    openTasks: row.openTasks ?? 0,
    overdueTasks: row.overdueTasks ?? 0,
  }));
}

export async function getUserForAdmin(userId: string): Promise<AdminUserRow> {
  const all = await listUsersForAdmin();
  const found = all.find((row) => row.id === userId);
  if (!found) throw new AppError("USER_NOT_FOUND");
  return found;
}

/* -------------------------------------------------------------------------- */
/*                              System overview                               */
/* -------------------------------------------------------------------------- */

export type SystemStats = {
  totalUsers: number;
  activeUsers: number;
  totalTasks: number;
  openTasks: number;
  overdueTasks: number;
  waitingTasks: number;
  completedTasks: number;
};

export async function getSystemStats(now: Date = new Date()): Promise<SystemStats> {
  const [userRows, taskRows] = await Promise.all([
    db
      .select({
        totalUsers: sql<number>`count(*)::int`,
        activeUsers: sql<number>`count(*) filter (where ${users.isActive})::int`,
      })
      .from(users),
    db
      .select({
        totalTasks: sql<number>`count(*)::int`,
        openTasks: sql<number>`count(*) filter (where ${tasks.status} in ('NEW', 'IN_PROGRESS', 'WAITING'))::int`,
        overdueTasks: sql<number>`count(*) filter (where ${tasks.dueDate} < ${now} and ${tasks.status} not in ('COMPLETED', 'CANCELLED'))::int`,
        waitingTasks: sql<number>`count(*) filter (where ${tasks.status} = 'WAITING')::int`,
        completedTasks: sql<number>`count(*) filter (where ${tasks.status} = 'COMPLETED')::int`,
      })
      .from(tasks),
  ]);

  return {
    totalUsers: userRows[0]?.totalUsers ?? 0,
    activeUsers: userRows[0]?.activeUsers ?? 0,
    totalTasks: taskRows[0]?.totalTasks ?? 0,
    openTasks: taskRows[0]?.openTasks ?? 0,
    overdueTasks: taskRows[0]?.overdueTasks ?? 0,
    waitingTasks: taskRows[0]?.waitingTasks ?? 0,
    completedTasks: taskRows[0]?.completedTasks ?? 0,
  };
}

export type SystemActivityRow = {
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

/** The complete, unfiltered history. Reserved for administrators. */
export async function listSystemActivity(limit = 100): Promise<SystemActivityRow[]> {
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
    .orderBy(desc(taskActivities.createdAt))
    .limit(limit);
}

/** Workload per person, used by the admin overview. */
export async function getWorkloadByUser(now: Date = new Date()) {
  return db
    .select({
      userId: users.id,
      name: users.name,
      openTasks: sql<number>`count(${tasks.id}) filter (where ${tasks.status} in ('NEW', 'IN_PROGRESS', 'WAITING'))::int`,
      overdueTasks: sql<number>`count(${tasks.id}) filter (where ${tasks.dueDate} < ${now} and ${tasks.status} not in ('COMPLETED', 'CANCELLED'))::int`,
    })
    .from(users)
    .leftJoin(tasks, eq(tasks.assignedToId, users.id))
    .where(eq(users.isActive, true))
    .groupBy(users.id, users.name)
    .orderBy(asc(users.name));
}

/* -------------------------------------------------------------------------- */
/*                               Guard helpers                                */
/* -------------------------------------------------------------------------- */

/** Number of administrators who can still sign in. */
export async function countActiveAdmins(excludeUserId?: string): Promise<number> {
  const conditions = [eq(users.role, "ADMIN"), eq(users.isActive, true)];
  const rows = await db
    .select({ value: count() })
    .from(users)
    .where(
      excludeUserId
        ? and(...conditions, notInArray(users.id, [excludeUserId]))
        : and(...conditions),
    );
  return rows[0]?.value ?? 0;
}

export async function isUsernameTaken(
  username: string,
  excludeUserId?: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username.toLowerCase()))
    .limit(2);

  return rows.some((row) => row.id !== excludeUserId);
}

export async function getUsersByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, ids));
}
