import type { Translator } from "@/lib/i18n/translate";
import { formatDate } from "@/lib/i18n/format";
import type { NotificationItem } from "./queries";

type NotificationTextKey = keyof Translator["dict"]["notifications"];

function lookup(key: string, t: Translator): string | null {
  const dictionary = t.dict.notifications as Record<string, unknown>;
  const value = dictionary[key as NotificationTextKey];
  return typeof value === "string" ? value : null;
}

/**
 * Notifications are stored as keys plus values, not as finished sentences, so
 * the same stored row reads naturally in whichever language the recipient is
 * using when they open it. Dates and enum values are resolved here, at display
 * time, for the same reason.
 */
export function renderNotification(
  item: NotificationItem,
  t: Translator,
): { title: string; body: string } {
  const title = lookup(item.titleKey, t) ?? t.dict.notifications.title;
  const bodyTemplate = lookup(item.bodyKey, t);

  const vars: Record<string, string> = { ...item.vars };

  if (vars.due) {
    const due = new Date(vars.due);
    if (!Number.isNaN(due.getTime())) vars.due = formatDate(due, t.locale);
  }

  if (vars.status && vars.status in t.dict.status) {
    vars.status = t.dict.status[vars.status as keyof Translator["dict"]["status"]];
  }

  if (vars.priority && vars.priority in t.dict.priority) {
    vars.priority = t.dict.priority[vars.priority as keyof Translator["dict"]["priority"]];
  }

  return {
    title,
    body: bodyTemplate ? t.fmt(bodyTemplate, vars) : "",
  };
}
