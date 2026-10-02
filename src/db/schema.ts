import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* -------------------------------------------------------------------------- */
/*                                   Enums                                    */
/* -------------------------------------------------------------------------- */

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "MANAGER", "MEMBER"]);

export const languageEnum = pgEnum("language", ["en", "ar"]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "NEW",
  "IN_PROGRESS",
  "WAITING",
  "COMPLETED",
  "CANCELLED",
]);

/**
 * Activity action types. These drive the task timeline and must stay stable,
 * because historical rows reference them for display.
 */
export const activityActionEnum = pgEnum("activity_action", [
  "TASK_CREATED",
  "TASK_ASSIGNED",
  "TASK_REASSIGNED",
  "TITLE_CHANGED",
  "DESCRIPTION_CHANGED",
  "PRIORITY_CHANGED",
  "DUE_DATE_CHANGED",
  "PROJECT_CHANGED",
  "CATEGORY_CHANGED",
  "LOCATION_CHANGED",
  "PARTICIPANT_ADDED",
  "PARTICIPANT_REMOVED",
  "STATUS_CHANGED",
  "UPDATE_ADDED",
  "UPDATE_EDITED",
  "WAITING_REASON_SET",
  "TASK_COMPLETED",
  "TASK_REOPENED",
  "TASK_CANCELLED",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "TASK_ASSIGNED",
  "TASK_REASSIGNED",
  "TASK_DUE_DATE_CHANGED",
  "TASK_PRIORITY_CHANGED",
  "TASK_UPDATED",
  "TASK_STATUS_CHANGED",
  "TASK_COMPLETED",
  "TASK_REOPENED",
  "TASK_CANCELLED",
  "TASK_OVERDUE",
]);

/* -------------------------------------------------------------------------- */
/*                                   Users                                    */
/* -------------------------------------------------------------------------- */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 120 }).notNull(),
    username: varchar("username", { length: 48 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    email: varchar("email", { length: 180 }),
    /** Stored in E.164 form where possible, because future WhatsApp delivery needs it. */
    phoneNumber: varchar("phone_number", { length: 24 }),
    role: userRoleEnum("role").notNull().default("MEMBER"),
    /** Permissions are deliberately separate from the role. */
    canViewAllTasks: boolean("can_view_all_tasks").notNull().default(false),
    canAssignTasks: boolean("can_assign_tasks").notNull().default(false),
    canEditOthersTasks: boolean("can_edit_others_tasks").notNull().default(false),
    preferredLanguage: languageEnum("preferred_language").notNull().default("en"),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("users_username_unique").on(table.username),
    index("users_is_active_idx").on(table.isActive),
    index("users_role_idx").on(table.role),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                  Sessions                                  */
/* -------------------------------------------------------------------------- */

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 hash of the opaque session token. The raw token never touches the database. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: varchar("user_agent", { length: 300 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

/* -------------------------------------------------------------------------- */
/*                             Login attempt log                              */
/* -------------------------------------------------------------------------- */

/** Backs login rate limiting. Rows are pruned opportunistically. */
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Lowercased username as typed, so attempts against unknown accounts count too. */
    identifier: varchar("identifier", { length: 64 }).notNull(),
    successful: boolean("successful").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("login_attempts_identifier_created_idx").on(table.identifier, table.createdAt),
  ],
);

/* -------------------------------------------------------------------------- */
/*                           Projects and categories                          */
/* -------------------------------------------------------------------------- */

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 80 }).notNull(),
    nameAr: varchar("name_ar", { length: 80 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("projects_name_unique").on(table.name)],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 80 }).notNull(),
    nameAr: varchar("name_ar", { length: 80 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("categories_name_unique").on(table.name)],
);

/* -------------------------------------------------------------------------- */
/*                                   Tasks                                    */
/* -------------------------------------------------------------------------- */

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    priority: taskPriorityEnum("priority").notNull().default("MEDIUM"),
    status: taskStatusEnum("status").notNull().default("NEW"),

    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    assignedById: uuid("assigned_by_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    assignedToId: uuid("assigned_to_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedById: uuid("completed_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledById: uuid("cancelled_by_id").references(() => users.id, {
      onDelete: "set null",
    }),

    /** Current blocker explanation. Required whenever status is WAITING. */
    waitingReason: text("waiting_reason"),

    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    location: varchar("location", { length: 160 }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tasks_assigned_to_idx").on(table.assignedToId),
    index("tasks_created_by_idx").on(table.createdById),
    index("tasks_status_idx").on(table.status),
    index("tasks_priority_idx").on(table.priority),
    index("tasks_due_date_idx").on(table.dueDate),
    index("tasks_project_idx").on(table.projectId),
    index("tasks_category_idx").on(table.categoryId),
    index("tasks_status_due_date_idx").on(table.status, table.dueDate),
    index("tasks_updated_at_idx").on(table.updatedAt),
  ],
);

/* -------------------------------------------------------------------------- */
/*                             Task participants                              */
/* -------------------------------------------------------------------------- */

export const taskParticipants = pgTable(
  "task_participants",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("task_participants_unique").on(table.taskId, table.userId),
    index("task_participants_user_idx").on(table.userId),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                Task updates                                */
/* -------------------------------------------------------------------------- */

export const taskUpdates = pgTable(
  "task_updates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    content: text("content").notNull(),
    /** Set when the author corrects an update inside the allowed edit window. */
    editedAt: timestamp("edited_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("task_updates_task_idx").on(table.taskId, table.createdAt),
    index("task_updates_author_idx").on(table.authorId),
  ],
);

/** Preserves the previous text of an edited update so history cannot be rewritten silently. */
export const taskUpdateRevisions = pgTable(
  "task_update_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    updateId: uuid("update_id")
      .notNull()
      .references(() => taskUpdates.id, { onDelete: "cascade" }),
    previousContent: text("previous_content").notNull(),
    editedById: uuid("edited_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("task_update_revisions_update_idx").on(table.updateId)],
);

/* -------------------------------------------------------------------------- */
/*                               Task activity                                */
/* -------------------------------------------------------------------------- */

export const taskActivities = pgTable(
  "task_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    action: activityActionEnum("action").notNull(),
    /** Raw previous value, stored as text so one column serves every action type. */
    oldValue: text("old_value"),
    newValue: text("new_value"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("task_activities_task_idx").on(table.taskId, table.createdAt),
    index("task_activities_actor_idx").on(table.actorId),
    index("task_activities_created_idx").on(table.createdAt),
  ],
);

/* -------------------------------------------------------------------------- */
/*                               Notifications                                */
/* -------------------------------------------------------------------------- */

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    /** Translation key plus JSON payload, so the text follows the reader language setting. */
    titleKey: varchar("title_key", { length: 80 }).notNull(),
    bodyKey: varchar("body_key", { length: 80 }).notNull(),
    payload: text("payload"),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    isRead: boolean("is_read").notNull().default(false),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notifications_user_read_idx").on(table.userId, table.isRead),
    index("notifications_user_created_idx").on(table.userId, table.createdAt),
    index("notifications_task_idx").on(table.taskId),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                 Relations                                  */
/* -------------------------------------------------------------------------- */

export const usersRelations = relations(users, ({ many }) => ({
  assignedTasks: many(tasks, { relationName: "assignedTasks" }),
  createdTasks: many(tasks, { relationName: "createdTasks" }),
  updates: many(taskUpdates),
  activities: many(taskActivities),
  notifications: many(notifications),
  participations: many(taskParticipants),
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  assignedTo: one(users, {
    fields: [tasks.assignedToId],
    references: [users.id],
    relationName: "assignedTasks",
  }),
  createdBy: one(users, {
    fields: [tasks.createdById],
    references: [users.id],
    relationName: "createdTasks",
  }),
  assignedBy: one(users, {
    fields: [tasks.assignedById],
    references: [users.id],
    relationName: "assignerTasks",
  }),
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  category: one(categories, { fields: [tasks.categoryId], references: [categories.id] }),
  updates: many(taskUpdates),
  activities: many(taskActivities),
  participants: many(taskParticipants),
}));

export const taskParticipantsRelations = relations(taskParticipants, ({ one }) => ({
  task: one(tasks, { fields: [taskParticipants.taskId], references: [tasks.id] }),
  user: one(users, { fields: [taskParticipants.userId], references: [users.id] }),
}));

export const taskUpdatesRelations = relations(taskUpdates, ({ one, many }) => ({
  task: one(tasks, { fields: [taskUpdates.taskId], references: [tasks.id] }),
  author: one(users, { fields: [taskUpdates.authorId], references: [users.id] }),
  revisions: many(taskUpdateRevisions),
}));

export const taskUpdateRevisionsRelations = relations(taskUpdateRevisions, ({ one }) => ({
  update: one(taskUpdates, {
    fields: [taskUpdateRevisions.updateId],
    references: [taskUpdates.id],
  }),
  editedBy: one(users, {
    fields: [taskUpdateRevisions.editedById],
    references: [users.id],
  }),
}));

export const taskActivitiesRelations = relations(taskActivities, ({ one }) => ({
  task: one(tasks, { fields: [taskActivities.taskId], references: [tasks.id] }),
  actor: one(users, { fields: [taskActivities.actorId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  task: one(tasks, { fields: [notifications.taskId], references: [tasks.id] }),
  actor: one(users, { fields: [notifications.actorId], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  tasks: many(tasks),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  tasks: many(tasks),
}));

/* -------------------------------------------------------------------------- */
/*                              Inferred types                                */
/* -------------------------------------------------------------------------- */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskUpdate = typeof taskUpdates.$inferSelect;
export type TaskActivity = typeof taskActivities.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Category = typeof categories.$inferSelect;

export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type Language = (typeof languageEnum.enumValues)[number];
export type TaskPriority = (typeof taskPriorityEnum.enumValues)[number];
export type TaskStatus = (typeof taskStatusEnum.enumValues)[number];
export type ActivityAction = (typeof activityActionEnum.enumValues)[number];
export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];
