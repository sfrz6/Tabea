import { describe, expect, it } from "vitest";
import {
  addUpdateSchema,
  changeStatusSchema,
  createTaskSchema,
  createUserSchema,
  loginSchema,
  taskFiltersSchema,
  toFieldErrors,
} from "@/lib/validation/schemas";
import { validationMessage } from "@/lib/validation/messages";
import { createTranslator } from "@/lib/i18n/translate";

/**
 * The schemas run on the server for every request, whatever the browser already
 * checked. Their messages are dictionary keys rather than sentences, so the
 * same rule reports itself correctly in Arabic and in English.
 */

const VALID_ID = "4f1e1f84-1b6f-4a7d-9a9e-1b6f4a7d9a9e";

describe("task creation", () => {
  const valid = {
    title: "Renew property insurance",
    description: "",
    assignedToId: VALID_ID,
    priority: "HIGH",
    dueDate: "2026-10-08",
    dueTime: "",
    participantIds: [],
  };

  it("accepts a complete task", () => {
    const result = createTaskSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("requires a title", () => {
    const result = createTaskSchema.safeParse({ ...valid, title: "   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error).title).toBe("titleRequired");
    }
  });

  it("requires an assignee", () => {
    const result = createTaskSchema.safeParse({ ...valid, assignedToId: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error).assignedToId).toBe("assigneeRequired");
    }
  });

  it("requires a due date in the expected form", () => {
    expect(createTaskSchema.safeParse({ ...valid, dueDate: "" }).success).toBe(false);
    expect(createTaskSchema.safeParse({ ...valid, dueDate: "8/10/2026" }).success).toBe(
      false,
    );
  });

  it("turns empty optional text into null rather than an empty string", () => {
    const result = createTaskSchema.safeParse({ ...valid, description: "   " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBeNull();
  });

  it("rejects an identifier that is not a real identifier", () => {
    const result = createTaskSchema.safeParse({ ...valid, assignedToId: "1 OR 1=1" });
    expect(result.success).toBe(false);
  });
});

describe("waiting requires a reason", () => {
  it("refuses Waiting with no explanation", () => {
    const result = changeStatusSchema.safeParse({
      taskId: VALID_ID,
      status: "WAITING",
      waitingReason: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error).waitingReason).toBe("waitingReasonRequired");
    }
  });

  it("refuses a reason too short to mean anything", () => {
    const result = changeStatusSchema.safeParse({
      taskId: VALID_ID,
      status: "WAITING",
      waitingReason: "x",
    });
    expect(result.success).toBe(false);
  });

  it("accepts Waiting with a real explanation", () => {
    const result = changeStatusSchema.safeParse({
      taskId: VALID_ID,
      status: "WAITING",
      waitingReason: "Waiting for the supplier quotation.",
    });
    expect(result.success).toBe(true);
  });

  it("does not demand a reason for any other status", () => {
    for (const status of ["NEW", "IN_PROGRESS", "COMPLETED", "CANCELLED"]) {
      const result = changeStatusSchema.safeParse({
        taskId: VALID_ID,
        status,
        waitingReason: "",
      });
      expect(result.success, `${status} should not need a reason`).toBe(true);
    }
  });
});

describe("progress updates", () => {
  it("refuses an empty update", () => {
    const result = addUpdateSchema.safeParse({ taskId: VALID_ID, content: "   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error).content).toBe("updateContentRequired");
    }
  });

  it("accepts a normal update", () => {
    const result = addUpdateSchema.safeParse({
      taskId: VALID_ID,
      content: "Visited the site and requested a quotation.",
    });
    expect(result.success).toBe(true);
  });
});

describe("account creation", () => {
  const valid = {
    name: "Mohammed Al Harthy",
    username: "Mohammed",
    password: "a-long-enough-password",
    email: "",
    phoneNumber: "",
    role: "MEMBER",
    canViewAllTasks: false,
    canAssignTasks: false,
    canEditOthersTasks: false,
    preferredLanguage: "ar",
    isActive: true,
  };

  it("lowercases the username so sign in is not case sensitive", () => {
    const result = createUserSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.username).toBe("mohammed");
  });

  it("rejects a username with spaces or symbols", () => {
    expect(createUserSchema.safeParse({ ...valid, username: "mo hammed" }).success).toBe(
      false,
    );
    expect(createUserSchema.safeParse({ ...valid, username: "mo@hammed" }).success).toBe(
      false,
    );
  });

  it("insists on a password of a usable length", () => {
    const result = createUserSchema.safeParse({ ...valid, password: "short" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error).password).toBe("passwordTooShort");
    }
  });

  it("normalises a phone number so it is ready for messaging later", () => {
    const result = createUserSchema.safeParse({
      ...valid,
      phoneNumber: "+968 9123 4567",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phoneNumber).toBe("+96891234567");
  });

  it("rejects a phone number that is not one", () => {
    expect(createUserSchema.safeParse({ ...valid, phoneNumber: "hello" }).success).toBe(
      false,
    );
  });

  it("has no permission for managing users to accept", () => {
    const result = createUserSchema.safeParse({
      ...valid,
      canManageUsers: true,
    } as Record<string, unknown>);

    expect(result.success).toBe(true);
    if (result.success) {
      // The field is not part of the schema, so it is dropped rather than stored.
      expect("canManageUsers" in result.data).toBe(false);
    }
  });
});

describe("list filters from the URL", () => {
  it("falls back to sensible defaults", () => {
    const result = taskFiltersSchema.parse({});
    expect(result.quick).toBe("all");
    expect(result.sort).toBe("dueDate");
    expect(result.page).toBe(1);
  });

  it("rejects a filter value that was not offered", () => {
    expect(() => taskFiltersSchema.parse({ quick: "everything" })).toThrow();
    expect(() => taskFiltersSchema.parse({ status: "ARCHIVED" })).toThrow();
  });

  it("keeps paging within bounds", () => {
    expect(() => taskFiltersSchema.parse({ page: 0 })).toThrow();
    expect(() => taskFiltersSchema.parse({ page: 99999 })).toThrow();
  });
});

describe("sign in", () => {
  it("needs both fields", () => {
    expect(loginSchema.safeParse({ username: "", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ username: "a", password: "" }).success).toBe(false);
  });
});

describe("validation messages", () => {
  it("reads correctly in both languages", () => {
    const english = createTranslator("en");
    const arabic = createTranslator("ar");

    expect(validationMessage("titleRequired", english)).toBe("Enter a task title.");
    expect(validationMessage("titleRequired", arabic)).toBe("أدخل عنوان المهمة.");
  });

  it("fills the limit into the message", () => {
    const english = createTranslator("en");
    expect(validationMessage("passwordTooShort", english)).toContain("10");
  });

  it("falls back safely for an unknown key", () => {
    const english = createTranslator("en");
    expect(validationMessage("not-a-real-key", english)).toBe(
      english.dict.validation.required,
    );
  });
});
