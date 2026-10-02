import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Translator } from "@/lib/i18n/translate";
import { formatRelativeTime } from "@/lib/i18n/format";
import { activityNote, activitySentence } from "@/features/tasks/components/activity-text";
import type { ActivityEntryRow } from "../queries";

/**
 * Recent history across everything the reader is allowed to see. It answers the
 * question the father actually asks: what has been happening, without calling
 * anyone.
 */
export function ActivityFeed({
  entries,
  t,
  now = new Date(),
  showTaskTitle = true,
  className,
}: {
  entries: ActivityEntryRow[];
  t: Translator;
  now?: Date;
  showTaskTitle?: boolean;
  className?: string;
}) {
  return (
    <ol className={cn("space-y-0", className)}>
      {entries.map((entry, index) => {
        const note = activityNote(entry);

        return (
          <li key={entry.id} className="relative flex gap-3 ps-1">
            {/* A quiet rail joining the entries, so the feed reads as a sequence. */}
            <div className="flex flex-col items-center">
              <span
                aria-hidden
                className="mt-2 size-1.5 shrink-0 rounded-full bg-border-strong"
              />
              {index < entries.length - 1 ? (
                <span aria-hidden className="w-px flex-1 bg-border" />
              ) : null}
            </div>

            <div className={cn("min-w-0 flex-1", index < entries.length - 1 && "pb-4")}>
              <p className="text-xs leading-relaxed text-ink-muted wrap-anywhere">
                {activitySentence(entry, t)}
              </p>

              {note ? (
                <p className="mt-1 rounded-[var(--radius-control)] bg-surface-sunken px-2.5 py-1.5 text-xs leading-relaxed text-ink-muted wrap-anywhere">
                  {note}
                </p>
              ) : null}

              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[0.6875rem] text-ink-subtle">
                <time dateTime={entry.createdAt.toISOString()} className="tabular">
                  {formatRelativeTime(entry.createdAt, t, now)}
                </time>
                {showTaskTitle ? (
                  <>
                    <span aria-hidden>·</span>
                    <Link
                      href={`/tasks/${entry.taskId}`}
                      className="truncate font-medium text-ink-muted underline-offset-2 hover:underline"
                    >
                      {entry.taskTitle}
                    </Link>
                  </>
                ) : null}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
