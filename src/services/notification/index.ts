import type { DbExecutor } from "@/db";
import { inAppProvider } from "./providers/in-app";
import type { NotificationEvent, NotificationProvider } from "./types";

/**
 * The notification service is the only thing task logic knows about delivery.
 * Task code builds events and hands them over; which channels exist is decided
 * here.
 *
 * Adding WhatsApp later means writing one provider with kind "external" and
 * registering it in PROVIDERS. No task logic changes, because tasks never refer
 * to a channel.
 *
 * Planned shape of that future path:
 *
 *   Tabea on Vercel -> NotificationService -> OpenWA provider -> OpenWA VPS
 *
 * External providers run after the database transaction commits, so a delivery
 * failure can never roll back a recorded task change.
 */
const PROVIDERS: NotificationProvider[] = [inAppProvider];

function enabledProviders(kind: NotificationProvider["kind"]): NotificationProvider[] {
  return PROVIDERS.filter((provider) => provider.kind === kind && provider.isEnabled());
}

export const notificationService = {
  /**
   * Called inside the transaction that is changing a task. Only providers that
   * write to Tabea's own database take part.
   */
  async dispatch(events: NotificationEvent[], db: DbExecutor): Promise<void> {
    if (events.length === 0) return;
    for (const provider of enabledProviders("database")) {
      await provider.deliver(events, { db });
    }
  },

  /**
   * Called after the transaction commits, for channels that leave the system.
   * Failures are logged and swallowed: the task change is already recorded and
   * must not be undone because a message could not be sent.
   */
  async dispatchExternal(events: NotificationEvent[], db: DbExecutor): Promise<void> {
    const providers = enabledProviders("external");
    if (events.length === 0 || providers.length === 0) return;

    await Promise.all(
      providers.map(async (provider) => {
        try {
          await provider.deliver(events, { db });
        } catch (error) {
          console.error(`[tabea] notification provider ${provider.name} failed`, error);
        }
      }),
    );
  },
};

export type { NotificationEvent, NotificationProvider } from "./types";
