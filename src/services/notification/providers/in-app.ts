import { notifications } from "@/db/schema";
import type { NotificationEvent, NotificationProvider } from "../types";

/**
 * Stores notifications in Tabea so the bell icon, the unread count and the
 * notifications page all read from one place. This is the only provider V1
 * requires.
 */
export const inAppProvider: NotificationProvider = {
  name: "in-app",
  kind: "database",

  isEnabled() {
    return true;
  },

  async deliver(events: NotificationEvent[], { db }) {
    if (events.length === 0) return;

    await db.insert(notifications).values(
      events.map((event) => ({
        userId: event.recipientId,
        type: event.type,
        titleKey: event.titleKey,
        bodyKey: event.bodyKey,
        payload: JSON.stringify(event.vars),
        taskId: event.taskId ?? null,
        actorId: event.actorId ?? null,
      })),
    );
  },
};
