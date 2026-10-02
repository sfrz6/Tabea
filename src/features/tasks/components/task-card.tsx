import Link from "next/link";
import { cn } from "@/lib/utils";
import { isOverdue } from "@/lib/dates";
import type { Translator } from "@/lib/i18n/translate";
import { formatDueLabel, formatOverdue, formatRelativeTime } from "@/lib/i18n/format";
import { Avatar } from "@/components/ui/surface";
import type { TaskListItem } from "../queries";
import { MetaPill, OverdueBadge, PriorityIndicator, StatusBadge } from "./badges";

/**
 * The card a person reads dozens of times a day. It answers four questions and
 * stops: what is it, where does it stand, when is it due, and what is the last
 * thing that happened. Anything more makes a list of twenty tasks unreadable on
 * a phone.
 */
export function TaskCard({
  task,
  t,
  showAssignee = true,
  now = new Date(),
  className,
}: {
  task: TaskListItem;
  t: Translator;
  showAssignee?: boolean;
  now?: Date;
  className?: string;
}) {
  const { dict, locale } = t;
  const overdue = isOverdue({ dueDate: task.dueDate, status: task.status }, now);
  const closed = task.status === "COMPLETED" || task.status === "CANCELLED";

  const projectLabel =
    locale === "ar" ? (task.projectNameAr ?? task.projectName) : task.projectName;

  // A blocked task shows what it is blocked on; otherwise the latest report.
  const footnote =
    task.status === "WAITING" && task.waitingReason
      ? { label: dict.tasks.fields.waitingReason, text: task.waitingReason, meta: null }
      : task.latestUpdate
        ? {
            label: null,
            text: task.latestUpdate.content,
            meta: `${task.latestUpdate.authorName} · ${formatRelativeTime(task.latestUpdate.createdAt, t, now)}`,
          }
        : null;

  return (
    <li className={cn("list-none", className)}>
      <Link
        href={`/tasks/${task.id}`}
        className={cn(
          "group block rounded-[var(--radius-card)] border bg-surface p-4 shadow-card",
          "transition-colors hover:border-border-strong",
          overdue ? "border-border border-s-[3px] border-s-danger" : "border-border",
        )}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3
              className={cn(
                "clamp-2 text-[0.9375rem] font-medium leading-snug text-ink wrap-anywhere",
                closed && "text-ink-muted",
              )}
            >
              {task.title}
            </h3>

            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <StatusBadge status={task.status} label={dict.status[task.status]} />

              {overdue ? (
                <OverdueBadge label={formatOverdue(task.dueDate, t, now)} />
              ) : (
                <span className="text-xs text-ink-muted tabular">
                  {closed && task.completedAt
                    ? formatRelativeTime(task.completedAt, t, now)
                    : formatDueLabel(task.dueDate, t, now)}
                </span>
              )}
            </div>
          </div>

          <PriorityIndicator
            priority={task.priority}
            label={t.fmt(dict.a11y.priorityLabel, { priority: dict.priority[task.priority] })}
            className="mt-0.5 shrink-0"
          />
        </div>

        {showAssignee || projectLabel ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-t border-border pt-2.5">
            {showAssignee ? (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <Avatar name={task.assignedTo.name} size="xs" />
                <span className="truncate text-xs text-ink-muted">
                  {task.assignedTo.name}
                </span>
              </span>
            ) : null}
            {projectLabel ? <MetaPill>{projectLabel}</MetaPill> : null}
          </div>
        ) : null}

        {footnote ? (
          <p
            className={cn(
              "clamp-2 mt-2.5 text-xs leading-relaxed text-ink-subtle wrap-anywhere",
              footnote.label && "rounded-[var(--radius-control)] bg-warn-soft px-2.5 py-2 text-warn",
            )}
          >
            {footnote.label ? (
              <span className="font-medium">{footnote.label}: </span>
            ) : null}
            {footnote.text}
            {footnote.meta ? (
              <span className="block pt-0.5 text-ink-subtle/80">{footnote.meta}</span>
            ) : null}
          </p>
        ) : null}
      </Link>
    </li>
  );
}

/** A plain list wrapper, so spacing stays identical everywhere cards appear. */
export function TaskCardList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <ul className={cn("space-y-2.5", className)}>{children}</ul>;
}
