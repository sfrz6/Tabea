import type { DbExecutor } from "@/db";
import { taskActivities, type ActivityAction } from "@/db/schema";

export type ActivityEntry = {
  taskId: string;
  actorId: string;
  action: ActivityAction;
  oldValue?: string | null;
  newValue?: string | null;
  note?: string | null;
};

/**
 * Writes the task history. Every meaningful change goes through here, inside
 * the same transaction as the change itself, so the record and the change can
 * never disagree.
 *
 * Values are stored in a stable form: enum names for status and priority, ISO
 * strings for dates, and the person's name as it stood at the time for anything
 * involving people. Storing the name rather than a reference means a record
 * such as "Task assigned to Mohammed" still reads correctly years later, even
 * if that account is deactivated.
 */
export async function recordActivity(
  db: DbExecutor,
  entries: ActivityEntry | ActivityEntry[],
): Promise<void> {
  const list = Array.isArray(entries) ? entries : [entries];
  if (list.length === 0) return;

  await db.insert(taskActivities).values(
    list.map((entry) => ({
      taskId: entry.taskId,
      actorId: entry.actorId,
      action: entry.action,
      oldValue: entry.oldValue ?? null,
      newValue: entry.newValue ?? null,
      note: entry.note ?? null,
    })),
  );
}
