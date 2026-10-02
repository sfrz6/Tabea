import type { ActivityAction, TaskPriority, TaskStatus } from "@/db/schema";
import type { Translator } from "@/lib/i18n/translate";
import { formatDate } from "@/lib/i18n/format";

export type ActivityLike = {
  action: ActivityAction;
  oldValue: string | null;
  newValue: string | null;
  note: string | null;
  actorName: string;
};

const STATUS_ACTIONS: ActivityAction[] = ["STATUS_CHANGED", "TASK_REOPENED"];
const PRIORITY_ACTIONS: ActivityAction[] = ["PRIORITY_CHANGED"];
const DATE_ACTIONS: ActivityAction[] = ["DUE_DATE_CHANGED"];

function isStatus(value: string, t: Translator): value is TaskStatus {
  return value in t.dict.status;
}

function isPriority(value: string, t: Translator): value is TaskPriority {
  return value in t.dict.priority;
}

/**
 * History rows store neutral values: enum names, ISO dates and the person's
 * name as it stood at the time. They are turned into readable text here, at
 * display time, which is why the same record reads correctly in Arabic and in
 * English without being written twice.
 */
function present(
  action: ActivityAction,
  value: string | null,
  t: Translator,
): string {
  if (!value) return t.dict.activity.emptyValue;

  if (STATUS_ACTIONS.includes(action) && isStatus(value, t)) {
    return t.dict.status[value];
  }

  if (PRIORITY_ACTIONS.includes(action) && isPriority(value, t)) {
    return t.dict.priority[value];
  }

  if (DATE_ACTIONS.includes(action)) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return formatDate(parsed, t.locale);
  }

  return value;
}

/** The one line sentence shown in a task timeline and in the activity log. */
export function activitySentence(entry: ActivityLike, t: Translator): string {
  const template = t.dict.activity[entry.action];

  return t.fmt(template, {
    actor: entry.actorName || t.dict.activity.systemActor,
    oldValue: present(entry.action, entry.oldValue, t),
    newValue: present(entry.action, entry.newValue, t),
  });
}

/**
 * Some entries carry an explanation the reader needs: why work stopped, or why
 * it was cancelled. Those are shown under the sentence rather than inside it.
 */
export function activityNote(entry: ActivityLike): string | null {
  if (!entry.note) return null;
  if (entry.action === "TASK_REOPENED") return null;
  return entry.note;
}
