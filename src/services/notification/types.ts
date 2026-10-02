import type { DbExecutor } from "@/db";
import type { NotificationType } from "@/db/schema";

/**
 * A notification is described once, in a language neutral form, and each
 * provider renders it for its own channel. The in app provider stores the keys
 * and lets the reader's language decide the wording; a future WhatsApp provider
 * would render the same keys into message text.
 */
export type NotificationEvent = {
  type: NotificationType;
  /** Who should receive it. */
  recipientId: string;
  /** Dictionary keys under notifications, for example title_TASK_ASSIGNED. */
  titleKey: string;
  bodyKey: string;
  /** Values for the placeholders in the body, already resolved to display text. */
  vars: Record<string, string>;
  taskId?: string | null;
  actorId?: string | null;
};

/**
 * Providers that write to Tabea's own database join the caller transaction, so
 * a notification never survives a rolled back task change. Providers that call
 * an outside system run after the transaction commits, where a failure can be
 * logged without losing the task change.
 */
export type ProviderKind = "database" | "external";

export interface NotificationProvider {
  readonly name: string;
  readonly kind: ProviderKind;
  isEnabled(): boolean;
  deliver(events: NotificationEvent[], context: { db: DbExecutor }): Promise<void>;
}
