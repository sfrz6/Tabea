import type { TaskStatus, UserRole } from "@/db/schema";
import { AppError } from "@/lib/errors";

/**
 * Every authorization decision in Tabea is made by one of the functions in this
 * file. Pages, server actions and route handlers all call the same checks, so a
 * rule can never drift between the interface and the server.
 *
 * Two rules are structural and deliberately not configurable:
 *
 *  1. Only ADMIN manages user accounts. There is no canManageUsers permission
 *     and no switch for it anywhere in the product.
 *  2. Seeing a task and changing a task are separate. Full visibility grants
 *     reading only.
 */

export type Actor = {
  id: string;
  role: UserRole;
  canViewAllTasks: boolean;
  canAssignTasks: boolean;
  canEditOthersTasks: boolean;
  isActive: boolean;
};

/** The minimum a task must expose for an authorization decision. */
export type TaskSubject = {
  createdById: string;
  assignedToId: string;
  status: TaskStatus;
  /** Present when participants have been loaded. Absent means none are known. */
  participantIds?: readonly string[];
};

/** How long after posting an update its author may still correct the wording. */
export const UPDATE_EDIT_WINDOW_MINUTES = 15;

/* -------------------------------------------------------------------------- */
/*                                 Role checks                                */
/* -------------------------------------------------------------------------- */

export function isAdmin(actor: Actor): boolean {
  return actor.role === "ADMIN";
}

/**
 * Account management is reserved for administrators. This is the only check for
 * it in the product and it is intentionally not driven by a stored permission.
 */
export function canManageUsers(actor: Actor): boolean {
  return isAdmin(actor);
}

export function canViewSystemActivity(actor: Actor): boolean {
  return isAdmin(actor);
}

export function canManageProjectsAndCategories(actor: Actor): boolean {
  return isAdmin(actor) || actor.role === "MANAGER";
}

/* -------------------------------------------------------------------------- */
/*                              Task visibility                               */
/* -------------------------------------------------------------------------- */

export type VisibilityScope = "ALL" | "OWN";

/** Drives both the list queries and the single task check, so they cannot diverge. */
export function visibilityScope(actor: Actor): VisibilityScope {
  return isAdmin(actor) || actor.canViewAllTasks ? "ALL" : "OWN";
}

export function canViewAllTasks(actor: Actor): boolean {
  return visibilityScope(actor) === "ALL";
}

/** True when the actor is personally connected to the task. */
export function isRelatedToTask(actor: Actor, task: TaskSubject): boolean {
  if (task.assignedToId === actor.id) return true;
  if (task.createdById === actor.id) return true;
  return task.participantIds?.includes(actor.id) ?? false;
}

export function canViewTask(actor: Actor, task: TaskSubject): boolean {
  if (canViewAllTasks(actor)) return true;
  return isRelatedToTask(actor, task);
}

/* -------------------------------------------------------------------------- */
/*                               Task authoring                               */
/* -------------------------------------------------------------------------- */

export function canCreateTasks(actor: Actor): boolean {
  // Creating a task means assigning work, including to oneself.
  return isAdmin(actor) || actor.canAssignTasks;
}

/** Assigning work to somebody other than oneself. */
export function canAssignToOthers(actor: Actor): boolean {
  return isAdmin(actor) || actor.canAssignTasks;
}

/**
 * Full edit rights: title, details, priority, due date, project, category,
 * location, participants and reassignment.
 */
export function canEditTask(actor: Actor, task: TaskSubject): boolean {
  if (isAdmin(actor)) return true;
  if (actor.canEditOthersTasks) return true;
  // The person who raised the work keeps control of its definition.
  if (task.createdById === actor.id) return true;
  return false;
}

export function canReassignTask(actor: Actor, task: TaskSubject): boolean {
  return canEditTask(actor, task) && canAssignToOthers(actor);
}

/* -------------------------------------------------------------------------- */
/*                            Progress and status                             */
/* -------------------------------------------------------------------------- */

const CLOSED_STATUSES: readonly TaskStatus[] = ["COMPLETED", "CANCELLED"];

export function isClosed(status: TaskStatus): boolean {
  return CLOSED_STATUSES.includes(status);
}

/**
 * Reporting progress is the responsibility of the person doing the work, plus
 * anyone who owns or manages the task. A pure viewer with full visibility can
 * read the task but cannot write into its record.
 */
export function canAddUpdate(actor: Actor, task: TaskSubject): boolean {
  if (isAdmin(actor)) return true;
  if (actor.canEditOthersTasks) return true;
  if (isRelatedToTask(actor, task)) return true;
  return false;
}

export function canChangeStatus(actor: Actor, task: TaskSubject): boolean {
  if (isAdmin(actor)) return true;
  if (actor.canEditOthersTasks) return true;
  if (task.assignedToId === actor.id) return true;
  if (task.createdById === actor.id) return true;
  return false;
}

export function canCompleteTask(actor: Actor, task: TaskSubject): boolean {
  if (isClosed(task.status)) return false;
  return canChangeStatus(actor, task);
}

/** Reopening is always recorded in the history, so the assignee may do it too. */
export function canReopenTask(actor: Actor, task: TaskSubject): boolean {
  if (!isClosed(task.status)) return false;
  return canChangeStatus(actor, task);
}

/** Deciding that work is no longer required is a management decision. */
export function canCancelTask(actor: Actor, task: TaskSubject): boolean {
  if (isClosed(task.status)) return false;
  return canEditTask(actor, task);
}

export function canEditOwnUpdate(
  actor: Actor,
  update: { authorId: string; createdAt: Date },
  now: Date = new Date(),
): boolean {
  if (update.authorId !== actor.id) return false;
  const elapsedMinutes = (now.getTime() - update.createdAt.getTime()) / 60_000;
  return elapsedMinutes <= UPDATE_EDIT_WINDOW_MINUTES;
}

/* -------------------------------------------------------------------------- */
/*                            Assertion helpers                               */
/* -------------------------------------------------------------------------- */

export function assertCanViewTask(actor: Actor, task: TaskSubject): void {
  // A task the actor may not see is reported as missing, so the interface never
  // confirms that a hidden task exists.
  if (!canViewTask(actor, task)) throw new AppError("TASK_NOT_FOUND");
}

export function assertCanEditTask(actor: Actor, task: TaskSubject): void {
  assertCanViewTask(actor, task);
  if (!canEditTask(actor, task)) throw new AppError("FORBIDDEN_EDIT");
}

export function assertCanChangeStatus(actor: Actor, task: TaskSubject): void {
  assertCanViewTask(actor, task);
  if (!canChangeStatus(actor, task)) throw new AppError("FORBIDDEN_EDIT");
}

export function assertCanAddUpdate(actor: Actor, task: TaskSubject): void {
  assertCanViewTask(actor, task);
  if (!canAddUpdate(actor, task)) throw new AppError("FORBIDDEN_EDIT");
}

export function assertCanCreateTasks(actor: Actor): void {
  if (!canCreateTasks(actor)) throw new AppError("FORBIDDEN_ASSIGN");
}

export function assertCanManageUsers(actor: Actor): void {
  if (!canManageUsers(actor)) throw new AppError("FORBIDDEN_ADMIN");
}

export function assertCanCancelTask(actor: Actor, task: TaskSubject): void {
  assertCanViewTask(actor, task);
  if (!canCancelTask(actor, task)) throw new AppError("FORBIDDEN_EDIT");
}

export function assertCanReopenTask(actor: Actor, task: TaskSubject): void {
  assertCanViewTask(actor, task);
  if (!canReopenTask(actor, task)) throw new AppError("FORBIDDEN_EDIT");
}

/* -------------------------------------------------------------------------- */
/*                         Interface capability bundle                        */
/* -------------------------------------------------------------------------- */

export type TaskCapabilities = {
  view: boolean;
  edit: boolean;
  reassign: boolean;
  changeStatus: boolean;
  addUpdate: boolean;
  complete: boolean;
  reopen: boolean;
  cancel: boolean;
};

/**
 * Computed once on the server and handed to the task screen, so buttons and
 * server actions agree. Hiding a control is presentation only: the matching
 * server action repeats the check before it writes anything.
 */
export function taskCapabilities(actor: Actor, task: TaskSubject): TaskCapabilities {
  return {
    view: canViewTask(actor, task),
    edit: canEditTask(actor, task),
    reassign: canReassignTask(actor, task),
    changeStatus: canChangeStatus(actor, task),
    addUpdate: canAddUpdate(actor, task),
    complete: canCompleteTask(actor, task),
    reopen: canReopenTask(actor, task),
    cancel: canCancelTask(actor, task),
  };
}
