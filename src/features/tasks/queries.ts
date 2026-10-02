import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gte,
  ilike,
  inArray,
  lt,
  lte,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  categories,
  projects,
  taskActivities,
  taskParticipants,
  taskUpdates,
  tasks,
  users,
  type ActivityAction,
  type TaskPriority,
  type TaskStatus,
  type UserRole,
} from "@/db/schema";
import { AppError } from "@/lib/errors";
import { endOfZonedDay, startOfNextZonedDay, startOfZonedDay } from "@/lib/dates";
import {
  assertCanViewTask,
  canEditOwnUpdate,
  taskCapabilities,
  visibilityScope,
  type Actor,
  type TaskCapabilities,
} from "@/lib/permissions";
import type { TaskFilters } from "@/lib/validation/schemas";

export const TASKS_PAGE_SIZE = 25;

export const OPEN_STATUSES: TaskStatus[] = ["NEW", "IN_PROGRESS", "WAITING"];
export const CLOSED_STATUSES: TaskStatus[] = ["COMPLETED", "CANCELLED"];

/** Second reference to the users table, for the task creator. */
const creatorUser = alias(users, "creator");

/* -------------------------------------------------------------------------- */
/*                          Visibility, enforced in SQL                       */
/* -------------------------------------------------------------------------- */

/**
 * The single source of truth for which task rows a person may read. Every list,
 * count, search and detail query goes through it, so a user restricted to their
 * own tasks cannot reach another task by guessing a URL or by crafting a
 * request: the row is simply not in their result set.
 */
export function visibilityCondition(actor: Actor): SQL | undefined {
  if (visibilityScope(actor) === "ALL") return undefined;

  return or(
    eq(tasks.assignedToId, actor.id),
    eq(tasks.createdById, actor.id),
    exists(
      db
        .select({ one: sql`1` })
        .from(taskParticipants)
        .where(
          and(eq(taskParticipants.taskId, tasks.id), eq(taskParticipants.userId, actor.id)),
        ),
    ),
  );
}

/* -------------------------------------------------------------------------- */
/*                                Projections                                 */
/* -------------------------------------------------------------------------- */

export type TaskPerson = {
  id: string;
  name: string;
};

export type TaskListItem = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  waitingReason: string | null;
  assignedTo: TaskPerson;
  createdBy: TaskPerson;
  projectName: string | null;
  projectNameAr: string | null;
  categoryName: string | null;
  categoryNameAr: string | null;
  latestUpdate: {
    content: string;
    createdAt: Date;
    authorName: string;
  } | null;
};

function taskListSelection() {
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      completedAt: tasks.completedAt,
      waitingReason: tasks.waitingReason,
      assigneeId: users.id,
      assigneeName: users.name,
      creatorId: creatorUser.id,
      creatorName: creatorUser.name,
      projectName: projects.name,
      projectNameAr: projects.nameAr,
      categoryName: categories.name,
      categoryNameAr: categories.nameAr,
    })
    .from(tasks)
    .innerJoin(users, eq(users.id, tasks.assignedToId))
    .innerJoin(creatorUser, eq(creatorUser.id, tasks.createdById))
    .leftJoin(projects, eq(projects.id, tasks.projectId))
    .leftJoin(categories, eq(categories.id, tasks.categoryId));
}

/* -------------------------------------------------------------------------- */
/*                                  Filters                                   */
/* -------------------------------------------------------------------------- */

export type TaskScope = "all" | "mine";

function quickFilterCondition(quick: TaskFilters["quick"], now: Date): SQL | undefined {
  switch (quick) {
    case "today":
      return and(
        gte(tasks.dueDate, startOfZonedDay(now)),
        lte(tasks.dueDate, endOfZonedDay(now)),
        notInArray(tasks.status, CLOSED_STATUSES),
      );
    case "overdue":
      return and(lt(tasks.dueDate, now), notInArray(tasks.status, CLOSED_STATUSES));
    case "upcoming":
      return and(
        gte(tasks.dueDate, startOfNextZonedDay(now)),
        notInArray(tasks.status, CLOSED_STATUSES),
      );
    case "open":
      return inArray(tasks.status, OPEN_STATUSES);
    case "completed":
      return eq(tasks.status, "COMPLETED");
    case "all":
    default:
      return undefined;
  }
}

/**
 * Free text search across the fields a person would actually remember. It is
 * applied on top of the visibility condition, never instead of it, so a search
 * can never surface a task the user is not allowed to see.
 */
function searchCondition(term: string): SQL | undefined {
  const pattern = `%${term.replace(/[%_\\]/g, (match) => `\\${match}`)}%`;
  return or(
    ilike(tasks.title, pattern),
    ilike(tasks.description, pattern),
    ilike(tasks.location, pattern),
    ilike(users.name, pattern),
    ilike(projects.name, pattern),
    ilike(projects.nameAr, pattern),
    ilike(categories.name, pattern),
    ilike(categories.nameAr, pattern),
  );
}

function buildConditions(
  actor: Actor,
  filters: TaskFilters,
  scope: TaskScope,
  now: Date,
): SQL | undefined {
  const parts: (SQL | undefined)[] = [visibilityCondition(actor)];

  if (scope === "mine") parts.push(eq(tasks.assignedToId, actor.id));

  parts.push(quickFilterCondition(filters.quick, now));

  if (filters.status) parts.push(eq(tasks.status, filters.status));
  if (filters.priority) parts.push(eq(tasks.priority, filters.priority));
  if (filters.assigneeId) parts.push(eq(tasks.assignedToId, filters.assigneeId));
  if (filters.projectId) parts.push(eq(tasks.projectId, filters.projectId));
  if (filters.categoryId) parts.push(eq(tasks.categoryId, filters.categoryId));
  if (filters.search) parts.push(searchCondition(filters.search));

  const defined = parts.filter((part): part is SQL => part !== undefined);
  return defined.length > 0 ? and(...defined) : undefined;
}

/** Urgent first. Expressed in SQL so paging stays correct across pages. */
const priorityRank = sql`case ${tasks.priority}
  when 'URGENT' then 0
  when 'HIGH' then 1
  when 'MEDIUM' then 2
  else 3 end`;

/** Open work sorts before finished work, so a long history never buries today. */
const openFirst = sql`case when ${tasks.status} in ('COMPLETED', 'CANCELLED') then 1 else 0 end`;

function orderByFor(sort: TaskFilters["sort"]): SQL[] {
  switch (sort) {
    case "priority":
      return [sql`${openFirst} asc`, sql`${priorityRank} asc`, sql`${tasks.dueDate} asc`];
    case "newest":
      return [sql`${tasks.createdAt} desc`];
    case "oldest":
      return [sql`${tasks.createdAt} asc`];
    case "recentlyUpdated":
      return [sql`${tasks.updatedAt} desc`];
    case "dueDate":
    default:
      return [sql`${openFirst} asc`, sql`${tasks.dueDate} asc`, sql`${priorityRank} asc`];
  }
}

/* -------------------------------------------------------------------------- */
/*                                 Task lists                                 */
/* -------------------------------------------------------------------------- */

export type TaskListResult = {
  items: TaskListItem[];
  total: number;
  page: number;
  pageCount: number;
};

/** Latest update per task, fetched for one page of results and merged in memory. */
async function latestUpdatesFor(
  taskIds: string[],
): Promise<Map<string, NonNullable<TaskListItem["latestUpdate"]>>> {
  const map = new Map<string, NonNullable<TaskListItem["latestUpdate"]>>();
  if (taskIds.length === 0) return map;

  const rows = await db
    .selectDistinctOn([taskUpdates.taskId], {
      taskId: taskUpdates.taskId,
      content: taskUpdates.content,
      createdAt: taskUpdates.createdAt,
      authorName: users.name,
    })
    .from(taskUpdates)
    .innerJoin(users, eq(users.id, taskUpdates.authorId))
    .where(inArray(taskUpdates.taskId, taskIds))
    .orderBy(taskUpdates.taskId, desc(taskUpdates.createdAt));

  for (const row of rows) {
    map.set(row.taskId, {
      content: row.content,
      createdAt: row.createdAt,
      authorName: row.authorName,
    });
  }
  return map;
}

export async function listTasks(
  actor: Actor,
  filters: TaskFilters,
  scope: TaskScope = "all",
  now: Date = new Date(),
): Promise<TaskListResult> {
  const where = buildConditions(actor, filters, scope, now);

  const totalRows = await db
    .select({ value: count() })
    .from(tasks)
    .innerJoin(users, eq(users.id, tasks.assignedToId))
    .leftJoin(projects, eq(projects.id, tasks.projectId))
    .leftJoin(categories, eq(categories.id, tasks.categoryId))
    .where(where);

  const total = totalRows[0]?.value ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / TASKS_PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);

  const rows = await taskListSelection()
    .where(where)
    .orderBy(...orderByFor(filters.sort))
    .limit(TASKS_PAGE_SIZE)
    .offset((page - 1) * TASKS_PAGE_SIZE);

  const updatesByTask = await latestUpdatesFor(rows.map((row) => row.id));

  const items: TaskListItem[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    dueDate: row.dueDate,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
    waitingReason: row.waitingReason,
    assignedTo: { id: row.assigneeId, name: row.assigneeName },
    createdBy: { id: row.creatorId, name: row.creatorName },
    projectName: row.projectName,
    projectNameAr: row.projectNameAr,
    categoryName: row.categoryName,
    categoryNameAr: row.categoryNameAr,
    latestUpdate: updatesByTask.get(row.id) ?? null,
  }));

  return { items, total, page, pageCount };
}

/** Compact list used by the dashboard sections, without paging machinery. */
export async function listTasksForDashboard(
  actor: Actor,
  options: {
    scope?: TaskScope;
    condition?: SQL | undefined;
    order: SQL[];
    limit: number;
  },
): Promise<TaskListItem[]> {
  const parts = [visibilityCondition(actor), options.condition].filter(
    (part): part is SQL => part !== undefined,
  );
  if (options.scope === "mine") parts.push(eq(tasks.assignedToId, actor.id));

  const rows = await taskListSelection()
    .where(parts.length > 0 ? and(...parts) : undefined)
    .orderBy(...options.order)
    .limit(options.limit);

  const updatesByTask = await latestUpdatesFor(rows.map((row) => row.id));

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    dueDate: row.dueDate,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
    waitingReason: row.waitingReason,
    assignedTo: { id: row.assigneeId, name: row.assigneeName },
    createdBy: { id: row.creatorId, name: row.creatorName },
    projectName: row.projectName,
    projectNameAr: row.projectNameAr,
    categoryName: row.categoryName,
    categoryNameAr: row.categoryNameAr,
    latestUpdate: updatesByTask.get(row.id) ?? null,
  }));
}

/* -------------------------------------------------------------------------- */
/*                                Task detail                                 */
/* -------------------------------------------------------------------------- */

export type TaskUpdateEntry = {
  id: string;
  content: string;
  createdAt: Date;
  editedAt: Date | null;
  author: TaskPerson;
  canEdit: boolean;
};

export type TaskActivityEntry = {
  id: string;
  action: ActivityAction;
  oldValue: string | null;
  newValue: string | null;
  note: string | null;
  createdAt: Date;
  actor: TaskPerson;
};

export type TaskDetail = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  waitingReason: string | null;
  location: string | null;
  createdAt: Date;
  updatedAt: Date;
  assignedTo: TaskPerson & { isActive: boolean };
  createdBy: TaskPerson;
  assignedBy: TaskPerson | null;
  completedBy: TaskPerson | null;
  projectId: string | null;
  categoryId: string | null;
  project: { id: string; name: string; nameAr: string | null } | null;
  category: { id: string; name: string; nameAr: string | null } | null;
  participants: TaskPerson[];
  updates: TaskUpdateEntry[];
  activities: TaskActivityEntry[];
  capabilities: TaskCapabilities;
};

/**
 * Loads a task for a specific person. Authorization happens here, not in the
 * page, and a task the actor may not see is reported as missing so the
 * interface never confirms that a hidden task exists.
 */
export async function getTaskDetail(
  actor: Actor,
  taskId: string,
  now: Date = new Date(),
): Promise<TaskDetail> {
  const rows = await db
    .select({
      task: tasks,
      assigneeName: users.name,
      assigneeActive: users.isActive,
    })
    .from(tasks)
    .innerJoin(users, eq(users.id, tasks.assignedToId))
    .where(eq(tasks.id, taskId))
    .limit(1);

  const row = rows[0];
  if (!row) throw new AppError("TASK_NOT_FOUND");

  const participants = await db
    .select({ id: users.id, name: users.name })
    .from(taskParticipants)
    .innerJoin(users, eq(users.id, taskParticipants.userId))
    .where(eq(taskParticipants.taskId, taskId))
    .orderBy(asc(users.name));

  const subject = {
    createdById: row.task.createdById,
    assignedToId: row.task.assignedToId,
    status: row.task.status,
    participantIds: participants.map((participant) => participant.id),
  };

  assertCanViewTask(actor, subject);

  const peopleIds = [
    row.task.createdById,
    row.task.assignedById,
    row.task.completedById,
  ].filter((value): value is string => Boolean(value));

  const [peopleRows, projectRows, categoryRows, updateRows, activityRows] = await Promise.all([
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, peopleIds)),
    row.task.projectId
      ? db
          .select({ id: projects.id, name: projects.name, nameAr: projects.nameAr })
          .from(projects)
          .where(eq(projects.id, row.task.projectId))
          .limit(1)
      : Promise.resolve([]),
    row.task.categoryId
      ? db
          .select({ id: categories.id, name: categories.name, nameAr: categories.nameAr })
          .from(categories)
          .where(eq(categories.id, row.task.categoryId))
          .limit(1)
      : Promise.resolve([]),
    db
      .select({
        id: taskUpdates.id,
        content: taskUpdates.content,
        createdAt: taskUpdates.createdAt,
        editedAt: taskUpdates.editedAt,
        authorId: users.id,
        authorName: users.name,
      })
      .from(taskUpdates)
      .innerJoin(users, eq(users.id, taskUpdates.authorId))
      .where(eq(taskUpdates.taskId, taskId))
      .orderBy(desc(taskUpdates.createdAt)),
    db
      .select({
        id: taskActivities.id,
        action: taskActivities.action,
        oldValue: taskActivities.oldValue,
        newValue: taskActivities.newValue,
        note: taskActivities.note,
        createdAt: taskActivities.createdAt,
        actorId: users.id,
        actorName: users.name,
      })
      .from(taskActivities)
      .innerJoin(users, eq(users.id, taskActivities.actorId))
      .where(eq(taskActivities.taskId, taskId))
      .orderBy(desc(taskActivities.createdAt)),
  ]);

  const peopleById = new Map(peopleRows.map((person) => [person.id, person]));
  const lookup = (id: string | null): TaskPerson | null =>
    id ? (peopleById.get(id) ?? null) : null;

  return {
    id: row.task.id,
    title: row.task.title,
    description: row.task.description,
    status: row.task.status,
    priority: row.task.priority,
    dueDate: row.task.dueDate,
    startedAt: row.task.startedAt,
    completedAt: row.task.completedAt,
    cancelledAt: row.task.cancelledAt,
    waitingReason: row.task.waitingReason,
    location: row.task.location,
    createdAt: row.task.createdAt,
    updatedAt: row.task.updatedAt,
    assignedTo: {
      id: row.task.assignedToId,
      name: row.assigneeName,
      isActive: row.assigneeActive,
    },
    createdBy: lookup(row.task.createdById) ?? { id: row.task.createdById, name: "" },
    assignedBy: lookup(row.task.assignedById),
    completedBy: lookup(row.task.completedById),
    projectId: row.task.projectId,
    categoryId: row.task.categoryId,
    project: projectRows[0] ?? null,
    category: categoryRows[0] ?? null,
    participants,
    updates: updateRows.map((update) => ({
      id: update.id,
      content: update.content,
      createdAt: update.createdAt,
      editedAt: update.editedAt,
      author: { id: update.authorId, name: update.authorName },
      canEdit: canEditOwnUpdate(
        actor,
        { authorId: update.authorId, createdAt: update.createdAt },
        now,
      ),
    })),
    activities: activityRows.map((activity) => ({
      id: activity.id,
      action: activity.action,
      oldValue: activity.oldValue,
      newValue: activity.newValue,
      note: activity.note,
      createdAt: activity.createdAt,
      actor: { id: activity.actorId, name: activity.actorName },
    })),
    capabilities: taskCapabilities(actor, subject),
  };
}

/* -------------------------------------------------------------------------- */
/*                               Support lookups                              */
/* -------------------------------------------------------------------------- */

export type AssignableUser = TaskPerson & { role: UserRole };

/** People who may receive new work. Inactive accounts are excluded by design. */
export async function getAssignableUsers(): Promise<AssignableUser[]> {
  return db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(eq(users.isActive, true))
    .orderBy(asc(users.name));
}

/** Everyone, including inactive accounts, so filters still work over old tasks. */
export async function getFilterableUsers(): Promise<(TaskPerson & { isActive: boolean })[]> {
  return db
    .select({ id: users.id, name: users.name, isActive: users.isActive })
    .from(users)
    .orderBy(asc(users.name));
}

export type TaxonomyOption = { id: string; name: string; nameAr: string | null };

export async function getActiveProjects(): Promise<TaxonomyOption[]> {
  return db
    .select({ id: projects.id, name: projects.name, nameAr: projects.nameAr })
    .from(projects)
    .where(eq(projects.isActive, true))
    .orderBy(asc(projects.name));
}

export async function getActiveCategories(): Promise<TaxonomyOption[]> {
  return db
    .select({ id: categories.id, name: categories.name, nameAr: categories.nameAr })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.name));
}

export { openFirst, priorityRank };
