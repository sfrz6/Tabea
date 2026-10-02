import "server-only";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications, type NotificationType } from "@/db/schema";

export const NOTIFICATIONS_PAGE_SIZE = 30;

export type NotificationItem = {
  id: string;
  type: NotificationType;
  titleKey: string;
  bodyKey: string;
  vars: Record<string, string>;
  taskId: string | null;
  isRead: boolean;
  createdAt: Date;
};

function parseVars(payload: string | null): Record<string, string> {
  if (!payload) return {};
  try {
    const parsed: unknown = JSON.parse(payload);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    // A malformed payload must never break the notifications page.
  }
  return {};
}

/** Notifications belong to one person, so the user id is the whole authorization rule. */
export async function listNotifications(
  userId: string,
  limit: number = NOTIFICATIONS_PAGE_SIZE,
): Promise<NotificationItem[]> {
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    titleKey: row.titleKey,
    bodyKey: row.bodyKey,
    vars: parseVars(row.payload),
    taskId: row.taskId,
    isRead: row.isRead,
    createdAt: row.createdAt,
  }));
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const rows = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  return rows[0]?.value ?? 0;
}
