/**
 * Development seed data.
 *
 * Creates the people and the tasks needed to see every part of Tabea working:
 * each status, an overdue task, a blocked task with a reason, progress updates,
 * a full activity history and unread notifications.
 *
 *   npm run db:seed              fills a development database with sample data
 *   npm run db:seed -- --admin   adds the first administrator, changing nothing else
 *   npm run db:seed -- --reset   clears every table and leaves one administrator
 *   npm run db:seed -- --force   allowed against a non development database
 *
 * The passwords here are development values and are printed when the script
 * finishes. They are never real credentials and must be changed before anybody
 * uses the system in earnest.
 */
import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { createDatabase } from "./driver";
import {
  categories,
  loginAttempts,
  notifications,
  projects,
  sessions,
  taskActivities,
  taskParticipants,
  taskUpdateRevisions,
  taskUpdates,
  tasks,
  users,
  type ActivityAction,
  type NewTask,
  type TaskPriority,
  type TaskStatus,
} from "./schema";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const DEV_PASSWORD = process.env.SEED_PASSWORD ?? "TabeaDev2026!";
const ADMIN_ONLY = process.argv.includes("--admin");
/** Clears every table and leaves a single administrator behind. */
const RESET = process.argv.includes("--reset");
const FORCE = process.argv.includes("--force");

const DAY = 86_400_000;
const HOUR = 3_600_000;

function daysFromNow(days: number, hour = 17): Date {
  const date = new Date(Date.now() + days * DAY);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * HOUR);
}

type SeedUser = {
  key: string;
  name: string;
  username: string;
  role: "ADMIN" | "MANAGER" | "MEMBER";
  canViewAllTasks: boolean;
  canAssignTasks: boolean;
  canEditOthersTasks: boolean;
  preferredLanguage: "en" | "ar";
  phoneNumber: string;
  isActive: boolean;
  note: string;
};

/**
 * The shape of a real family operation: one administrator who looks after the
 * accounts, a father who assigns and follows up, two sons with different levels
 * of visibility, and a worker who sees only their own jobs.
 */
const SEED_USERS: SeedUser[] = [
  {
    key: "admin",
    name: "System Administrator",
    username: "admin",
    role: "ADMIN",
    canViewAllTasks: true,
    canAssignTasks: true,
    canEditOthersTasks: true,
    preferredLanguage: "en",
    phoneNumber: "+96890000001",
    isActive: true,
    note: "Manages accounts. Only this role can.",
  },
  {
    key: "father",
    name: "Salim Al Harthy",
    username: "salim",
    role: "MANAGER",
    canViewAllTasks: true,
    canAssignTasks: true,
    canEditOthersTasks: true,
    preferredLanguage: "ar",
    phoneNumber: "+96890000002",
    isActive: true,
    note: "Assigns work and follows it up. Sees everything.",
  },
  {
    key: "son1",
    name: "Mohammed Al Harthy",
    username: "mohammed",
    role: "MEMBER",
    canViewAllTasks: true,
    canAssignTasks: true,
    canEditOthersTasks: false,
    preferredLanguage: "ar",
    phoneNumber: "+96890000003",
    isActive: true,
    note: "Sees every task but cannot edit the tasks of others.",
  },
  {
    key: "son2",
    name: "Yousef Al Harthy",
    username: "yousef",
    role: "MEMBER",
    canViewAllTasks: true,
    canAssignTasks: false,
    canEditOthersTasks: false,
    preferredLanguage: "en",
    phoneNumber: "+96890000004",
    isActive: true,
    note: "Sees every task, cannot assign or edit the tasks of others.",
  },
  {
    key: "worker",
    name: "Rashid Al Balushi",
    username: "rashid",
    role: "MEMBER",
    canViewAllTasks: false,
    canAssignTasks: false,
    canEditOthersTasks: false,
    preferredLanguage: "ar",
    phoneNumber: "+96890000005",
    isActive: true,
    note: "Own tasks only. Cannot reach any other task.",
  },
];

const SEED_PROJECTS = [
  { name: "Farm", nameAr: "المزرعة" },
  { name: "Building", nameAr: "العمارة" },
  { name: "Shop", nameAr: "المحل" },
];

const SEED_CATEGORIES = [
  { name: "Maintenance", nameAr: "صيانة" },
  { name: "Government", nameAr: "معاملات حكومية" },
  { name: "Payment", nameAr: "مدفوعات" },
  { name: "Purchase", nameAr: "مشتريات" },
  { name: "Follow-up", nameAr: "متابعة" },
];

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and add your Neon connection string.",
    );
  }

  if (process.env.NODE_ENV === "production" && !FORCE) {
    throw new Error(
      "Refusing to seed a production database. Re-run with --force only if that is genuinely what you intend.",
    );
  }

  const { db, close } = createDatabase(url);

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);

  if (ADMIN_ONLY || RESET) {
    if (RESET) {
      // Everything goes, including the sample people and their work, leaving a
      // system with one administrator and nothing else. Ordered so that foreign
      // keys are never violated.
      console.log("clearing every table");
      await db.delete(taskUpdateRevisions);
      await db.delete(taskUpdates);
      await db.delete(taskActivities);
      await db.delete(notifications);
      await db.delete(taskParticipants);
      await db.delete(tasks);
      await db.delete(sessions);
      await db.delete(loginAttempts);
      await db.delete(users);
      await db.delete(projects);
      await db.delete(categories);
    }

    await db
      .insert(users)
      .values({
        name: "System Administrator",
        username: "admin",
        passwordHash,
        role: "ADMIN",
        canViewAllTasks: true,
        canAssignTasks: true,
        canEditOthersTasks: true,
        preferredLanguage: "en",
        isActive: true,
      })
      .onConflictDoNothing();

    console.log(RESET ? "Database reset. One administrator remains." : "Administrator account ready.");
    console.log(`  username: admin`);
    console.log(`  password: ${DEV_PASSWORD}`);
    console.log("Change this password immediately after the first sign in.");
    await close();
    return;
  }

  console.log("clearing existing data");
  // Ordered so that foreign keys are never violated.
  await db.delete(taskUpdateRevisions);
  await db.delete(taskUpdates);
  await db.delete(taskActivities);
  await db.delete(notifications);
  await db.delete(taskParticipants);
  await db.delete(tasks);
  await db.delete(sessions);
  await db.delete(loginAttempts);
  await db.delete(users);
  await db.delete(projects);
  await db.delete(categories);

  console.log("creating people");
  const insertedUsers = await db
    .insert(users)
    .values(
      SEED_USERS.map((user) => ({
        name: user.name,
        username: user.username,
        passwordHash,
        phoneNumber: user.phoneNumber,
        role: user.role,
        canViewAllTasks: user.canViewAllTasks,
        canAssignTasks: user.canAssignTasks,
        canEditOthersTasks: user.canEditOthersTasks,
        preferredLanguage: user.preferredLanguage,
        isActive: user.isActive,
        lastLoginAt: hoursAgo(6),
      })),
    )
    .returning({ id: users.id, username: users.username });

  const userId = (username: string): string => {
    const found = insertedUsers.find((row) => row.username === username);
    if (!found) throw new Error(`seed user ${username} was not created`);
    return found.id;
  };

  const father = userId("salim");
  const son1 = userId("mohammed");
  const son2 = userId("yousef");
  const worker = userId("rashid");

  console.log("creating projects and categories");
  const insertedProjects = await db
    .insert(projects)
    .values(SEED_PROJECTS)
    .returning({ id: projects.id, name: projects.name });
  const insertedCategories = await db
    .insert(categories)
    .values(SEED_CATEGORIES)
    .returning({ id: categories.id, name: categories.name });

  const projectId = (name: string): string =>
    insertedProjects.find((row) => row.name === name)?.id ?? insertedProjects[0]!.id;
  const categoryId = (name: string): string =>
    insertedCategories.find((row) => row.name === name)?.id ?? insertedCategories[0]!.id;

  console.log("creating tasks");

  type SeedTask = Omit<NewTask, "id"> & {
    key: string;
    updates?: { authorId: string; content: string; createdAt: Date }[];
    activity: {
      actorId: string;
      action: ActivityAction;
      oldValue?: string | null;
      newValue?: string | null;
      note?: string | null;
      createdAt: Date;
    }[];
    participants?: string[];
    notify?: { userId: string; type: "TASK_ASSIGNED" | "TASK_UPDATED"; isRead: boolean }[];
  };

  const names = new Map(
    SEED_USERS.map((user) => [userId(user.username), user.name] as const),
  );
  const nameOf = (id: string): string => names.get(id) ?? "";

  const seedTasks: SeedTask[] = [
    {
      key: "insurance",
      title: "Renew property insurance",
      description:
        "The policy on the building expires this month. Collect two quotations before renewing, and keep the receipt for the accounts.",
      priority: "HIGH" as TaskPriority,
      status: "NEW" as TaskStatus,
      createdById: father,
      assignedById: father,
      assignedToId: son1,
      dueDate: daysFromNow(6),
      projectId: projectId("Building"),
      categoryId: categoryId("Payment"),
      createdAt: hoursAgo(30),
      updatedAt: hoursAgo(30),
      activity: [
        { actorId: father, action: "TASK_CREATED", createdAt: hoursAgo(30) },
        {
          actorId: father,
          action: "TASK_ASSIGNED",
          newValue: nameOf(son1),
          createdAt: hoursAgo(30),
        },
      ],
      notify: [{ userId: son1, type: "TASK_ASSIGNED", isRead: false }],
    },
    {
      key: "pump",
      title: "Repair the farm water pump",
      description:
        "The pump stopped on Tuesday. Call the technician we used last season and ask him to inspect it on site.",
      priority: "URGENT" as TaskPriority,
      status: "WAITING" as TaskStatus,
      createdById: father,
      assignedById: father,
      assignedToId: worker,
      dueDate: daysFromNow(2),
      startedAt: hoursAgo(50),
      waitingReason: "Waiting for the supplier quotation on the replacement motor.",
      projectId: projectId("Farm"),
      categoryId: categoryId("Maintenance"),
      location: "Farm, north pump house",
      createdAt: hoursAgo(72),
      updatedAt: hoursAgo(20),
      participants: [son1],
      updates: [
        {
          authorId: worker,
          content:
            "Visited the farm today. The technician inspected the pump and will send the quotation tomorrow.",
          createdAt: hoursAgo(46),
        },
        {
          authorId: worker,
          content:
            "The technician says the motor has to be replaced. He is waiting for a price from the supplier in Barka.",
          createdAt: hoursAgo(20),
        },
      ],
      activity: [
        { actorId: father, action: "TASK_CREATED", createdAt: hoursAgo(72) },
        {
          actorId: father,
          action: "TASK_ASSIGNED",
          newValue: nameOf(worker),
          createdAt: hoursAgo(72),
        },
        {
          actorId: worker,
          action: "STATUS_CHANGED",
          oldValue: "NEW",
          newValue: "IN_PROGRESS",
          createdAt: hoursAgo(50),
        },
        { actorId: worker, action: "UPDATE_ADDED", createdAt: hoursAgo(46) },
        {
          actorId: worker,
          action: "STATUS_CHANGED",
          oldValue: "IN_PROGRESS",
          newValue: "WAITING",
          note: "Waiting for the supplier quotation on the replacement motor.",
          createdAt: hoursAgo(21),
        },
        { actorId: worker, action: "UPDATE_ADDED", createdAt: hoursAgo(20) },
      ],
      notify: [
        { userId: father, type: "TASK_UPDATED", isRead: false },
        { userId: son1, type: "TASK_UPDATED", isRead: true },
      ],
    },
    {
      key: "municipality",
      title: "Submit the shop licence renewal at the municipality",
      description:
        "Take the ownership papers and last year's licence. The office closes at one in the afternoon.",
      priority: "HIGH" as TaskPriority,
      status: "IN_PROGRESS" as TaskStatus,
      createdById: father,
      assignedById: father,
      assignedToId: son2,
      dueDate: daysFromNow(3),
      startedAt: hoursAgo(26),
      projectId: projectId("Shop"),
      categoryId: categoryId("Government"),
      location: "Muscat municipality office",
      createdAt: hoursAgo(96),
      updatedAt: hoursAgo(26),
      updates: [
        {
          authorId: son2,
          content:
            "Papers are collected and checked. I will go to the municipality office on Sunday morning.",
          createdAt: hoursAgo(26),
        },
      ],
      activity: [
        { actorId: father, action: "TASK_CREATED", createdAt: hoursAgo(96) },
        {
          actorId: father,
          action: "TASK_ASSIGNED",
          newValue: nameOf(son2),
          createdAt: hoursAgo(96),
        },
        {
          actorId: son2,
          action: "STATUS_CHANGED",
          oldValue: "NEW",
          newValue: "IN_PROGRESS",
          createdAt: hoursAgo(26),
        },
        { actorId: son2, action: "UPDATE_ADDED", createdAt: hoursAgo(26) },
      ],
      notify: [{ userId: father, type: "TASK_UPDATED", isRead: false }],
    },
    {
      key: "electricity",
      title: "Pay the electricity bill for the building",
      description: "The bill arrived by message. Pay it before the due date to avoid the fine.",
      priority: "MEDIUM" as TaskPriority,
      status: "NEW" as TaskStatus,
      createdById: father,
      assignedById: father,
      assignedToId: son1,
      // Deliberately in the past, so the overdue treatment is visible.
      dueDate: daysFromNow(-4),
      projectId: projectId("Building"),
      categoryId: categoryId("Payment"),
      createdAt: hoursAgo(190),
      updatedAt: hoursAgo(190),
      activity: [
        { actorId: father, action: "TASK_CREATED", createdAt: hoursAgo(190) },
        {
          actorId: father,
          action: "TASK_ASSIGNED",
          newValue: nameOf(son1),
          createdAt: hoursAgo(190),
        },
      ],
      notify: [{ userId: son1, type: "TASK_ASSIGNED", isRead: true }],
    },
    {
      key: "fence",
      title: "Replace the broken fence panels at the farm gate",
      priority: "MEDIUM" as TaskPriority,
      status: "IN_PROGRESS" as TaskStatus,
      createdById: son1,
      assignedById: son1,
      assignedToId: worker,
      dueDate: daysFromNow(-1, 12),
      startedAt: hoursAgo(28),
      projectId: projectId("Farm"),
      categoryId: categoryId("Maintenance"),
      createdAt: hoursAgo(120),
      updatedAt: hoursAgo(28),
      updates: [
        {
          authorId: worker,
          content: "Two panels are fitted. The remaining three need longer bolts.",
          createdAt: hoursAgo(28),
        },
      ],
      activity: [
        { actorId: son1, action: "TASK_CREATED", createdAt: hoursAgo(120) },
        {
          actorId: son1,
          action: "TASK_ASSIGNED",
          newValue: nameOf(worker),
          createdAt: hoursAgo(120),
        },
        {
          actorId: worker,
          action: "STATUS_CHANGED",
          oldValue: "NEW",
          newValue: "IN_PROGRESS",
          createdAt: hoursAgo(28),
        },
        { actorId: worker, action: "UPDATE_ADDED", createdAt: hoursAgo(28) },
      ],
      notify: [{ userId: son1, type: "TASK_UPDATED", isRead: false }],
    },
    {
      key: "fertiliser",
      title: "Buy fertiliser for the date palms",
      priority: "LOW" as TaskPriority,
      status: "COMPLETED" as TaskStatus,
      createdById: father,
      assignedById: father,
      assignedToId: son1,
      dueDate: daysFromNow(-6),
      startedAt: hoursAgo(200),
      completedAt: hoursAgo(170),
      completedById: son1,
      projectId: projectId("Farm"),
      categoryId: categoryId("Purchase"),
      createdAt: hoursAgo(240),
      updatedAt: hoursAgo(170),
      updates: [
        {
          authorId: son1,
          content: "Bought twelve bags from the agricultural supplier and stored them in the shed.",
          createdAt: hoursAgo(172),
        },
      ],
      activity: [
        { actorId: father, action: "TASK_CREATED", createdAt: hoursAgo(240) },
        {
          actorId: father,
          action: "TASK_ASSIGNED",
          newValue: nameOf(son1),
          createdAt: hoursAgo(240),
        },
        {
          actorId: son1,
          action: "STATUS_CHANGED",
          oldValue: "NEW",
          newValue: "IN_PROGRESS",
          createdAt: hoursAgo(200),
        },
        { actorId: son1, action: "UPDATE_ADDED", createdAt: hoursAgo(172) },
        {
          actorId: son1,
          action: "STATUS_CHANGED",
          oldValue: "IN_PROGRESS",
          newValue: "COMPLETED",
          createdAt: hoursAgo(170),
        },
        { actorId: son1, action: "TASK_COMPLETED", createdAt: hoursAgo(170) },
      ],
      notify: [{ userId: father, type: "TASK_UPDATED", isRead: true }],
    },
    {
      key: "shelving",
      title: "Order new shelving for the shop storeroom",
      priority: "LOW" as TaskPriority,
      status: "CANCELLED" as TaskStatus,
      createdById: father,
      assignedById: father,
      assignedToId: son2,
      dueDate: daysFromNow(-10),
      cancelledAt: hoursAgo(260),
      cancelledById: father,
      projectId: projectId("Shop"),
      categoryId: categoryId("Purchase"),
      createdAt: hoursAgo(300),
      updatedAt: hoursAgo(260),
      activity: [
        { actorId: father, action: "TASK_CREATED", createdAt: hoursAgo(300) },
        {
          actorId: father,
          action: "TASK_ASSIGNED",
          newValue: nameOf(son2),
          createdAt: hoursAgo(300),
        },
        {
          actorId: father,
          action: "TASK_CANCELLED",
          note: "The storeroom will be rebuilt first, so new shelving is not needed yet.",
          createdAt: hoursAgo(260),
        },
      ],
    },
    {
      key: "tenant",
      title: "Follow up with the tenant about the rent transfer",
      priority: "HIGH" as TaskPriority,
      status: "NEW" as TaskStatus,
      createdById: father,
      assignedById: father,
      assignedToId: father,
      dueDate: daysFromNow(0, 20),
      projectId: projectId("Building"),
      categoryId: categoryId("Follow-up"),
      createdAt: hoursAgo(10),
      updatedAt: hoursAgo(10),
      activity: [
        { actorId: father, action: "TASK_CREATED", createdAt: hoursAgo(10) },
        {
          actorId: father,
          action: "TASK_ASSIGNED",
          newValue: nameOf(father),
          createdAt: hoursAgo(10),
        },
      ],
    },
  ];

  for (const seed of seedTasks) {
    const {
      key: _key,
      updates: seedUpdates,
      activity,
      participants,
      notify,
      ...taskValues
    } = seed;

    const inserted = await db
      .insert(tasks)
      .values(taskValues)
      .returning({ id: tasks.id, title: tasks.title });

    const task = inserted[0];
    if (!task) continue;

    if (participants?.length) {
      await db
        .insert(taskParticipants)
        .values(participants.map((id) => ({ taskId: task.id, userId: id })));
    }

    if (seedUpdates?.length) {
      await db
        .insert(taskUpdates)
        .values(seedUpdates.map((update) => ({ taskId: task.id, ...update })));
    }

    await db.insert(taskActivities).values(
      activity.map((entry) => ({
        taskId: task.id,
        actorId: entry.actorId,
        action: entry.action,
        oldValue: entry.oldValue ?? null,
        newValue: entry.newValue ?? null,
        note: entry.note ?? null,
        createdAt: entry.createdAt,
      })),
    );

    if (notify?.length) {
      await db.insert(notifications).values(
        notify.map((entry) => ({
          userId: entry.userId,
          type: entry.type,
          titleKey: `title_${entry.type}`,
          bodyKey: `body_${entry.type}`,
          payload: JSON.stringify({
            actor: nameOf(taskValues.createdById),
            task: task.title,
            due: taskValues.dueDate.toISOString(),
          }),
          taskId: task.id,
          actorId: taskValues.createdById,
          isRead: entry.isRead,
          createdAt: taskValues.updatedAt ?? new Date(),
        })),
      );
    }
  }

  console.log("");
  console.log(`Seeded ${SEED_USERS.length} people and ${seedTasks.length} tasks.`);
  console.log("");
  console.log("Development accounts, all with the same password:");
  console.log(`  password: ${DEV_PASSWORD}`);
  console.log("");
  for (const user of SEED_USERS) {
    console.log(`  ${user.username.padEnd(10)} ${user.name}`);
    console.log(`  ${" ".repeat(10)} ${user.note}`);
  }
  console.log("");
  console.log("These are development credentials. Never use them anywhere real.");

  await close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
