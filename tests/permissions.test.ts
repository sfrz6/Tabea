import { describe, expect, it } from "vitest";
import {
  canAddUpdate,
  canAssignToOthers,
  canCancelTask,
  canChangeStatus,
  canCompleteTask,
  canCreateTasks,
  canEditOwnUpdate,
  canEditTask,
  canManageUsers,
  canReopenTask,
  canViewTask,
  taskCapabilities,
  visibilityScope,
  type Actor,
  type TaskSubject,
} from "@/lib/permissions";
import { AppError } from "@/lib/errors";
import { assertCanEditTask, assertCanViewTask } from "@/lib/permissions";

/**
 * These tests cover the authorization rules the product depends on. They work
 * on the same functions the pages, the server actions and the queries call, so
 * a rule cannot pass here and behave differently in the application.
 */

const admin: Actor = {
  id: "admin",
  role: "ADMIN",
  canViewAllTasks: true,
  canAssignTasks: true,
  canEditOthersTasks: true,
  isActive: true,
};

/** The father: a manager with full visibility and full task rights. */
const father: Actor = {
  id: "father",
  role: "MANAGER",
  canViewAllTasks: true,
  canAssignTasks: true,
  canEditOthersTasks: true,
  isActive: true,
};

/** A son who sees every task but may not edit the tasks of others. */
const son: Actor = {
  id: "son",
  role: "MEMBER",
  canViewAllTasks: true,
  canAssignTasks: true,
  canEditOthersTasks: false,
  isActive: true,
};

/** A worker restricted to their own tasks. */
const worker: Actor = {
  id: "worker",
  role: "MEMBER",
  canViewAllTasks: false,
  canAssignTasks: false,
  canEditOthersTasks: false,
  isActive: true,
};

const sonTask: TaskSubject = {
  createdById: "father",
  assignedToId: "son",
  status: "NEW",
};

const workerTask: TaskSubject = {
  createdById: "father",
  assignedToId: "worker",
  status: "IN_PROGRESS",
};

describe("user management", () => {
  it("is reserved for the administrator", () => {
    expect(canManageUsers(admin)).toBe(true);
    expect(canManageUsers(father)).toBe(false);
    expect(canManageUsers(son)).toBe(false);
    expect(canManageUsers(worker)).toBe(false);
  });

  it("cannot be granted by any stored permission", () => {
    const managerWithEverything: Actor = {
      ...father,
      canViewAllTasks: true,
      canAssignTasks: true,
      canEditOthersTasks: true,
    };
    expect(canManageUsers(managerWithEverything)).toBe(false);
  });
});

describe("task visibility", () => {
  it("gives full scope to the administrator and to anyone granted it", () => {
    expect(visibilityScope(admin)).toBe("ALL");
    expect(visibilityScope(father)).toBe("ALL");
    expect(visibilityScope(son)).toBe("ALL");
    expect(visibilityScope(worker)).toBe("OWN");
  });

  it("lets a son with full visibility see a worker task", () => {
    expect(canViewTask(son, workerTask)).toBe(true);
  });

  it("hides another person's task from an own tasks only user", () => {
    expect(canViewTask(worker, sonTask)).toBe(false);
  });

  it("shows an own tasks only user the work assigned to them", () => {
    expect(canViewTask(worker, workerTask)).toBe(true);
  });

  it("shows a task to somebody added as a participant", () => {
    const withParticipant: TaskSubject = { ...sonTask, participantIds: ["worker"] };
    expect(canViewTask(worker, withParticipant)).toBe(true);
  });

  it("shows a task to the person who raised it", () => {
    const raisedByWorker: TaskSubject = {
      createdById: "worker",
      assignedToId: "son",
      status: "NEW",
    };
    expect(canViewTask(worker, raisedByWorker)).toBe(true);
  });

  it("reports an unauthorized task as missing rather than forbidden", () => {
    // The interface must never confirm that a hidden task exists.
    expect(() => assertCanViewTask(worker, sonTask)).toThrowError(AppError);
    try {
      assertCanViewTask(worker, sonTask);
    } catch (error) {
      expect((error as AppError).code).toBe("TASK_NOT_FOUND");
    }
  });
});

describe("viewing is separate from editing", () => {
  it("does not let full visibility imply edit rights", () => {
    expect(canViewTask(son, workerTask)).toBe(true);
    expect(canEditTask(son, workerTask)).toBe(false);
  });

  it("lets the father edit the task of anybody", () => {
    expect(canEditTask(father, workerTask)).toBe(true);
    expect(canEditTask(father, sonTask)).toBe(true);
  });

  it("lets a person edit a task they raised themselves", () => {
    const raisedBySon: TaskSubject = {
      createdById: "son",
      assignedToId: "worker",
      status: "NEW",
    };
    expect(canEditTask(son, raisedBySon)).toBe(true);
  });

  it("refuses the edit with a permission error, not a missing task", () => {
    try {
      assertCanEditTask(son, workerTask);
      throw new Error("expected the edit to be refused");
    } catch (error) {
      expect((error as AppError).code).toBe("FORBIDDEN_EDIT");
    }
  });

  it("keeps an own tasks only user away from editing work of others", () => {
    expect(canEditTask(worker, sonTask)).toBe(false);
  });
});

describe("assignment", () => {
  it("requires the assign permission", () => {
    expect(canAssignToOthers(father)).toBe(true);
    expect(canAssignToOthers(son)).toBe(true);
    expect(canAssignToOthers(worker)).toBe(false);
  });

  it("lets the administrator assign regardless of stored permissions", () => {
    const strippedAdmin: Actor = { ...admin, canAssignTasks: false };
    expect(canAssignToOthers(strippedAdmin)).toBe(true);
    expect(canCreateTasks(strippedAdmin)).toBe(true);
  });

  it("keeps a worker from raising work", () => {
    expect(canCreateTasks(worker)).toBe(false);
  });
});

describe("progress and status", () => {
  it("lets the assignee change the status of their own task", () => {
    expect(canChangeStatus(worker, workerTask)).toBe(true);
    expect(canCompleteTask(worker, workerTask)).toBe(true);
  });

  it("stops a viewer with no stake in the task from changing it", () => {
    // The son can see the worker task and cannot edit it, so he must not be
    // able to move it along either.
    expect(canChangeStatus(son, workerTask)).toBe(false);
    expect(canAddUpdate(son, workerTask)).toBe(false);
  });

  it("lets the assignee post progress", () => {
    expect(canAddUpdate(worker, workerTask)).toBe(true);
  });

  it("lets a participant post progress", () => {
    const withParticipant: TaskSubject = { ...sonTask, participantIds: ["worker"] };
    expect(canAddUpdate(worker, withParticipant)).toBe(true);
  });

  it("does not offer completion on a task that is already closed", () => {
    expect(canCompleteTask(father, { ...sonTask, status: "COMPLETED" })).toBe(false);
    expect(canCompleteTask(father, { ...sonTask, status: "CANCELLED" })).toBe(false);
  });

  it("offers reopening only on a closed task", () => {
    expect(canReopenTask(father, { ...sonTask, status: "COMPLETED" })).toBe(true);
    expect(canReopenTask(father, { ...sonTask, status: "NEW" })).toBe(false);
  });

  it("treats cancelling as a management decision", () => {
    // The assignee can report and complete, but deciding the work is no longer
    // required belongs to whoever can edit the task.
    expect(canCancelTask(worker, workerTask)).toBe(false);
    expect(canCancelTask(father, workerTask)).toBe(true);
  });
});

describe("correcting an update", () => {
  const createdAt = new Date("2026-10-02T10:00:00Z");

  it("allows the author a short window", () => {
    const now = new Date("2026-10-02T10:05:00Z");
    expect(canEditOwnUpdate(worker, { authorId: "worker", createdAt }, now)).toBe(true);
  });

  it("closes the window once it has passed", () => {
    const now = new Date("2026-10-02T11:00:00Z");
    expect(canEditOwnUpdate(worker, { authorId: "worker", createdAt }, now)).toBe(false);
  });

  it("never lets somebody else rewrite it", () => {
    const now = new Date("2026-10-02T10:01:00Z");
    expect(canEditOwnUpdate(father, { authorId: "worker", createdAt }, now)).toBe(false);
    expect(canEditOwnUpdate(admin, { authorId: "worker", createdAt }, now)).toBe(false);
  });
});

describe("capabilities handed to the interface", () => {
  it("matches the individual checks exactly", () => {
    const capabilities = taskCapabilities(son, workerTask);

    expect(capabilities).toEqual({
      view: canViewTask(son, workerTask),
      edit: canEditTask(son, workerTask),
      reassign: false,
      changeStatus: canChangeStatus(son, workerTask),
      addUpdate: canAddUpdate(son, workerTask),
      complete: canCompleteTask(son, workerTask),
      reopen: canReopenTask(son, workerTask),
      cancel: canCancelTask(son, workerTask),
    });
  });

  it("shows the son a read only view of a worker task", () => {
    const capabilities = taskCapabilities(son, workerTask);
    expect(capabilities.view).toBe(true);
    expect(capabilities.edit).toBe(false);
    expect(capabilities.changeStatus).toBe(false);
    expect(capabilities.addUpdate).toBe(false);
  });
});
