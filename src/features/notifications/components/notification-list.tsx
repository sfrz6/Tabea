"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";
import { formatRelativeTime } from "@/lib/i18n/format";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/surface";
import type { NotificationItem } from "../queries";
import { renderNotification } from "../render";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "../actions";

/**
 * Notifications are stored as keys plus values and rendered here, so a message
 * created while the sender was using Arabic still reads correctly for somebody
 * whose interface is in English.
 */
export function NotificationList({
  items,
  unreadCount,
}: {
  items: NotificationItem[];
  unreadCount: number;
}) {
  const t = useI18n();
  const { dict } = t;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function markAll(): void {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  }

  function open(item: NotificationItem): void {
    if (item.isRead) return;
    startTransition(async () => {
      await markNotificationReadAction(item.id);
    });
  }

  if (items.length === 0) {
    return (
      <EmptyState title={dict.notifications.empty} description={dict.notifications.emptyHint} />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          {unreadCount > 0
            ? t.plural(dict.notifications.unreadCount, unreadCount)
            : dict.notifications.allRead}
        </p>

        {unreadCount > 0 ? (
          <Button size="sm" variant="ghost" onClick={markAll} disabled={pending}>
            <CheckCheck aria-hidden size={16} />
            {dict.notifications.markAllAsRead}
          </Button>
        ) : null}
      </div>

      <ul className="space-y-2">
        {items.map((item) => {
          const { title, body } = renderNotification(item, t);
          const content = (
            <>
              <div className="flex items-start gap-2.5">
                {/* An unread marker, so colour is not the only difference. */}
                <span
                  aria-hidden
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    item.isRead ? "bg-transparent" : "bg-brand",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm wrap-anywhere",
                      item.isRead ? "text-ink-muted" : "font-medium text-ink",
                    )}
                  >
                    {title}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-muted wrap-anywhere">
                    {body}
                  </p>
                  <time
                    dateTime={item.createdAt.toISOString()}
                    className="mt-1 block text-xs text-ink-subtle"
                  >
                    {formatRelativeTime(item.createdAt, t)}
                  </time>
                </div>
              </div>
            </>
          );

          return (
            <li key={item.id}>
              {item.taskId ? (
                <Link
                  href={`/tasks/${item.taskId}`}
                  onClick={() => open(item)}
                  className={cn(
                    "block rounded-[var(--radius-card)] border p-3.5 shadow-card transition-colors",
                    item.isRead
                      ? "border-border bg-surface"
                      : "border-brand/25 bg-brand-soft/35",
                    "hover:border-border-strong",
                  )}
                >
                  {content}
                </Link>
              ) : (
                <div
                  className={cn(
                    "rounded-[var(--radius-card)] border border-border bg-surface p-3.5 shadow-card",
                  )}
                >
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
