import { z } from "zod";
import {
  languageEnum,
  taskPriorityEnum,
  taskStatusEnum,
  userRoleEnum,
} from "@/db/schema";
import { LIMITS } from "./limits";

/**
 * Every schema here runs on the server, even when the browser has already
 * checked the same rule. Messages are dictionary keys, not sentences, so the
 * user sees them in their own language.
 */

const trimmed = z.string().trim();

const optionalText = (max: number) =>
  trimmed
    .max(max)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional();

export const localeSchema = z.enum(languageEnum.enumValues);
export const prioritySchema = z.enum(taskPriorityEnum.enumValues, {
  message: "priorityRequired",
});
export const statusSchema = z.enum(taskStatusEnum.enumValues);
export const roleSchema = z.enum(userRoleEnum.enumValues, { message: "roleInvalid" });

/** Identifiers arrive from form fields, so they are validated like any other input. */
const uuidField = (message: string) => z.uuid({ message });
const uuidSchema = uuidField("required");

/* -------------------------------------------------------------------------- */
/*                               Authentication                               */
/* -------------------------------------------------------------------------- */

export const loginSchema = z.object({
  username: trimmed.min(1, "usernameRequired").max(LIMITS.usernameMax),
  password: z.string().min(1, "required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/* -------------------------------------------------------------------------- */
/*                                   Tasks                                    */
/* -------------------------------------------------------------------------- */

const dueDateSchema = trimmed
  .min(1, "dueDateRequired")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "dueDateInvalid");

const dueTimeSchema = trimmed
  .regex(/^(\d{1,2}:\d{2})?$/, "dueDateInvalid")
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

export const createTaskSchema = z.object({
  title: trimmed.min(1, "titleRequired").max(LIMITS.taskTitleMax, "titleTooLong"),
  description: optionalText(LIMITS.taskDescriptionMax),
  assignedToId: uuidField("assigneeRequired"),
  priority: prioritySchema,
  dueDate: dueDateSchema,
  dueTime: dueTimeSchema,
  projectId: uuidSchema.nullable().optional(),
  categoryId: uuidSchema.nullable().optional(),
  location: optionalText(LIMITS.taskLocationMax),
  participantIds: z.array(uuidSchema).max(20).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const editTaskSchema = createTaskSchema.extend({
  taskId: uuidSchema,
});

export type EditTaskInput = z.infer<typeof editTaskSchema>;

/**
 * Setting Waiting requires a blocker explanation. The rule lives in the schema
 * so the server rejects the change even if the interface is bypassed.
 */
export const changeStatusSchema = z
  .object({
    taskId: uuidSchema,
    status: statusSchema,
    waitingReason: optionalText(LIMITS.waitingReasonMax),
  })
  .refine(
    (value) =>
      value.status !== "WAITING" ||
      (value.waitingReason !== null &&
        value.waitingReason !== undefined &&
        value.waitingReason.length >= LIMITS.waitingReasonMin),
    { message: "waitingReasonRequired", path: ["waitingReason"] },
  );

export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;

export const addUpdateSchema = z.object({
  taskId: uuidSchema,
  content: trimmed
    .min(1, "updateContentRequired")
    .max(LIMITS.updateContentMax, "updateTooLong"),
});

export type AddUpdateInput = z.infer<typeof addUpdateSchema>;

export const editUpdateSchema = z.object({
  updateId: uuidSchema,
  content: trimmed
    .min(1, "updateContentRequired")
    .max(LIMITS.updateContentMax, "updateTooLong"),
});

export const cancelTaskSchema = z.object({
  taskId: uuidSchema,
  reason: optionalText(LIMITS.waitingReasonMax),
});

export const reopenTaskSchema = z.object({
  taskId: uuidSchema,
});

export const completeTaskSchema = z.object({
  taskId: uuidSchema,
  note: optionalText(LIMITS.updateContentMax),
});

/* -------------------------------------------------------------------------- */
/*                                   Users                                    */
/* -------------------------------------------------------------------------- */

const usernameSchema = trimmed
  .min(LIMITS.usernameMin, "usernameTooShort")
  .max(LIMITS.usernameMax, "usernameTooShort")
  .regex(/^[a-zA-Z0-9._-]+$/, "usernameFormat")
  .transform((value) => value.toLowerCase());

const passwordSchema = z.string().min(LIMITS.passwordMin, "passwordTooShort");

const emailSchema = trimmed
  .max(LIMITS.emailMax)
  .refine((value) => value.length === 0 || z.email().safeParse(value).success, {
    message: "emailInvalid",
  })
  .transform((value) => (value.length === 0 ? null : value.toLowerCase()))
  .nullable()
  .optional();

/** Permissive on formatting, strict on shape, because numbers come from several countries. */
const phoneSchema = trimmed
  .max(LIMITS.phoneMax)
  .refine((value) => value.length === 0 || /^\+?[0-9\s-]{7,}$/.test(value), {
    message: "phoneInvalid",
  })
  .transform((value) => (value.length === 0 ? null : value.replace(/[\s-]/g, "")))
  .nullable()
  .optional();

const permissionFields = {
  role: roleSchema,
  canViewAllTasks: z.boolean(),
  canAssignTasks: z.boolean(),
  canEditOthersTasks: z.boolean(),
  preferredLanguage: localeSchema,
  isActive: z.boolean(),
};

export const createUserSchema = z.object({
  name: trimmed.min(1, "nameRequired").max(LIMITS.nameMax),
  username: usernameSchema,
  password: passwordSchema,
  email: emailSchema,
  phoneNumber: phoneSchema,
  ...permissionFields,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const editUserSchema = z.object({
  userId: uuidSchema,
  name: trimmed.min(1, "nameRequired").max(LIMITS.nameMax),
  username: usernameSchema,
  email: emailSchema,
  phoneNumber: phoneSchema,
  ...permissionFields,
});

export type EditUserInput = z.infer<typeof editUserSchema>;

export const resetUserPasswordSchema = z
  .object({
    userId: uuidSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "passwordMismatch",
    path: ["confirmPassword"],
  });

export const setUserActiveSchema = z.object({
  userId: uuidSchema,
  isActive: z.boolean(),
});

/* -------------------------------------------------------------------------- */
/*                                  Profile                                   */
/* -------------------------------------------------------------------------- */

export const updateProfileSchema = z.object({
  name: trimmed.min(1, "nameRequired").max(LIMITS.nameMax),
  email: emailSchema,
  phoneNumber: phoneSchema,
  preferredLanguage: localeSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "required"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "passwordMismatch",
    path: ["confirmPassword"],
  });

/* -------------------------------------------------------------------------- */
/*                         Projects and categories                            */
/* -------------------------------------------------------------------------- */

export const createTaxonomySchema = z.object({
  kind: z.enum(["project", "category"]),
  name: trimmed.min(1, "required").max(LIMITS.projectNameMax),
  nameAr: optionalText(LIMITS.projectNameMax),
});

export const toggleTaxonomySchema = z.object({
  kind: z.enum(["project", "category"]),
  id: uuidSchema,
  isActive: z.boolean(),
});

/* -------------------------------------------------------------------------- */
/*                              Task list query                               */
/* -------------------------------------------------------------------------- */

export const taskSortSchema = z
  .enum(["dueDate", "priority", "newest", "oldest", "recentlyUpdated"])
  .default("dueDate");

export const taskQuickFilterSchema = z
  .enum(["all", "today", "overdue", "upcoming", "open", "completed"])
  .default("all");

/** Parsed from the URL, so a shared link reproduces the same view. */
export const taskFiltersSchema = z.object({
  quick: taskQuickFilterSchema,
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  assigneeId: uuidSchema.optional(),
  projectId: uuidSchema.optional(),
  categoryId: uuidSchema.optional(),
  search: trimmed.max(LIMITS.searchMax).optional(),
  sort: taskSortSchema,
  page: z.coerce.number().int().min(1).max(500).default(1),
});

export type TaskFilters = z.infer<typeof taskFiltersSchema>;

/* -------------------------------------------------------------------------- */
/*                              Parsing helpers                               */
/* -------------------------------------------------------------------------- */

/** Flattens Zod issues into the field error map that server actions return. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.join(".") || "form";
    if (!result[field]) result[field] = issue.message;
  }
  return result;
}
