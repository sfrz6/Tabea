"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUserOrThrow } from "@/lib/auth/current-user";
import { actionOk, toActionResult, type ActionResult } from "@/lib/errors";

export type NotificationActionState = ActionResult<undefined>;

/**
 * Both actions scope the write to the signed in user, so one person can never
 * mark somebody else's notification as read by sending its identifier.
 */
export async function markNotificationReadAction(
  notificationId: string,
): Promise<NotificationActionState> {
  try {
    const user = await requireUserOrThrow();

    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(eq(notifications.id, notificationId), eq(notifications.userId, user.id)),
      );

    revalidatePath("/notifications");
    return actionOk();
  } catch (error) {
    return toActionResult(error);
  }
}

export async function markAllNotificationsReadAction(): Promise<NotificationActionState> {
  try {
    const user = await requireUserOrThrow();

    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)));

    revalidatePath("/notifications");
    return actionOk();
  } catch (error) {
    return toActionResult(error);
  }
}
