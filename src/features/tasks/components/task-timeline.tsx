import type { Translator } from "@/lib/i18n/translate";
import { formatDateTime, formatDayHeading } from "@/lib/i18n/format";
import { calendarDaysBetween } from "@/lib/dates";
import { EmptyState } from "@/components/ui/surface";
import type { TaskActivityEntry } from "../queries";
import { activityNote, activitySentence } from "./activity-text";

/**
 * The accountability record for one task, newest first and grouped by day. It
 * is what answers the arguments this product exists to end: who changed the
 * deadline, when the work was reported as blocked, and when it was finished.
 */
export function TaskTimeline({
  entries,
  t,
  now = new Date(),
}: {
  entries: TaskActivityEntry[];
  t: Translator;
  now?: Date;
}) {
  if (entries.length === 0) {
    return <EmptyState title={t.dict.admin.noActivity} />;
  }

  // Group consecutive entries that fall on the same day in application time.
  const groups: { key: string; heading: string; items: TaskActivityEntry[] }[] = [];

  for (const entry of entries) {
    const dayKey = String(calendarDaysBetween(entry.createdAt, now));
    const last = groups[groups.length - 1];
    if (last && last.key === dayKey) {
      last.items.push(entry);
    } else {
      groups.push({
        key: dayKey,
        heading: formatDayHeading(entry.createdAt, t, now),
        items: [entry],
      });
    }
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.key}>
          <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            {group.heading}
          </h3>

          <ol className="space-y-0">
            {group.items.map((entry, index) => {
              const row = { ...entry, actorName: entry.actor.name };
              const note = activityNote(row);
              const isLast = index === group.items.length - 1;

              return (
                <li key={entry.id} className="relative flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      aria-hidden
                      className="mt-1.5 size-2 shrink-0 rounded-full border-2 border-brand bg-surface"
                    />
                    {!isLast ? (
                      <span aria-hidden className="w-px flex-1 bg-border" />
                    ) : null}
                  </div>

                  <div className={isLast ? "min-w-0 flex-1" : "min-w-0 flex-1 pb-4"}>
                    <p className="text-sm leading-relaxed text-ink wrap-anywhere">
                      {activitySentence(row, t)}
                    </p>

                    {note ? (
                      <p className="mt-1.5 rounded-[var(--radius-control)] bg-surface-sunken px-3 py-2 text-sm leading-relaxed text-ink-muted wrap-anywhere">
                        {note}
                      </p>
                    ) : null}

                    <time
                      dateTime={entry.createdAt.toISOString()}
                      className="mt-1 block text-xs text-ink-subtle tabular"
                    >
                      {formatDateTime(entry.createdAt, t.locale)}
                    </time>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
