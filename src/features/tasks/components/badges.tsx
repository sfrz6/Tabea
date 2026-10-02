import { cn } from "@/lib/utils";
import type { TaskPriority, TaskStatus } from "@/db/schema";

/* -------------------------------------------------------------------------- */
/*                                Status badge                                */
/* -------------------------------------------------------------------------- */

const STATUS_TONE: Record<TaskStatus, { pill: string; dot: string }> = {
  NEW: { pill: "bg-neutral-soft text-ink-muted", dot: "bg-ink-subtle" },
  IN_PROGRESS: { pill: "bg-info-soft text-info", dot: "bg-info" },
  WAITING: { pill: "bg-warn-soft text-warn", dot: "bg-warn" },
  COMPLETED: { pill: "bg-success-soft text-success", dot: "bg-success" },
  CANCELLED: { pill: "bg-neutral-soft text-ink-subtle", dot: "bg-ink-subtle" },
};

/**
 * Status is carried by a dot and by its text, never by colour alone, so it is
 * still readable to somebody who cannot distinguish the hues.
 */
export function StatusBadge({
  status,
  label,
  className,
}: {
  status: TaskStatus;
  label: string;
  className?: string;
}) {
  const tone = STATUS_TONE[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        tone.pill,
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", tone.dot)} />
      {label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*                             Priority indicator                             */
/* -------------------------------------------------------------------------- */

const PRIORITY_LEVEL: Record<TaskPriority, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
};

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  LOW: "bg-ink-subtle",
  MEDIUM: "bg-ink-muted",
  HIGH: "bg-warn",
  URGENT: "bg-danger",
};

/**
 * Four rising bars rather than four coloured pills. It shows urgency at a
 * glance without turning a list of tasks into a colour chart, and only the top
 * two levels borrow a semantic colour.
 */
export function PriorityIndicator({
  priority,
  label,
  showLabel = false,
  className,
}: {
  priority: TaskPriority;
  label: string;
  /** Accessible name, always present even when the text is hidden. */
  accessibleLabel?: string;
  showLabel?: boolean;
  className?: string;
}) {
  const level = PRIORITY_LEVEL[priority];
  const color = PRIORITY_COLOR[priority];

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      title={label}
    >
      <span aria-hidden className="flex items-end gap-[2px]">
        {[1, 2, 3, 4].map((bar) => (
          <span
            key={bar}
            className={cn(
              "w-[3px] rounded-[1px]",
              bar === 1 && "h-[5px]",
              bar === 2 && "h-[7px]",
              bar === 3 && "h-[9px]",
              bar === 4 && "h-[11px]",
              bar <= level ? color : "bg-border-strong",
            )}
          />
        ))}
      </span>
      <span className={cn("text-xs font-medium text-ink-muted", !showLabel && "sr-only")}>
        {label}
      </span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Overdue badge                                */
/* -------------------------------------------------------------------------- */

/**
 * Overdue work has to be impossible to miss, but a wall of red makes a busy
 * list unreadable. A tinted pill with an explicit duration does the job.
 */
export function OverdueBadge({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-2 py-0.5",
        "text-xs font-semibold text-danger",
        className,
      )}
    >
      <svg aria-hidden width="11" height="11" viewBox="0 0 12 12" fill="none">
        <path
          d="M6 1.5v5l2.5 1.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      {label}
    </span>
  );
}

/** Neutral pill for a project, a category or a location. */
export function MetaPill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full bg-surface-sunken px-2 py-0.5",
        "text-xs text-ink-muted",
        className,
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}
