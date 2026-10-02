import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { initialsOf } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                    Card                                    */
/* -------------------------------------------------------------------------- */

export function Card({
  children,
  className,
  as: Component = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  return (
    <Component
      className={cn(
        "rounded-[var(--radius-card)] border border-border bg-surface shadow-card",
        className,
      )}
    >
      {children}
    </Component>
  );
}

/** Section heading used across the dashboard and the task detail page. */
export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight text-ink">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-ink-subtle">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Empty state                                */
/* -------------------------------------------------------------------------- */

/**
 * Plain and useful. No illustration, because an empty task list is normal and
 * should not be dressed up as an event.
 */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-dashed border-border bg-surface/60 px-5 py-8 text-center",
        className,
      )}
    >
      <p className="text-sm font-medium text-ink">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-ink-subtle">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Skeleton                                  */
/* -------------------------------------------------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-md", className)} />;
}

/** Matches the real task card dimensions, so nothing shifts when data lands. */
export function TaskCardSkeleton() {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <Skeleton className="mt-1 size-2 rounded-full" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Avatar                                   */
/* -------------------------------------------------------------------------- */

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const dimension =
    size === "xs" ? "size-6 text-[0.625rem]" : size === "sm" ? "size-7 text-xs" : "size-9 text-sm";

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        "bg-brand-soft font-semibold text-brand",
        dimension,
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Metadata                                  */
/* -------------------------------------------------------------------------- */

/** Label and value pair used on the task detail page and in admin views. */
export function MetaRow({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 py-2.5", className)}>
      <dt className="shrink-0 text-xs font-medium text-ink-subtle">{label}</dt>
      <dd className="min-w-0 text-end text-sm text-ink wrap-anywhere">{children}</dd>
    </div>
  );
}

export function MetaList({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn("divide-y divide-border", className)}>{children}</dl>;
}

/* -------------------------------------------------------------------------- */
/*                               Inline notice                                */
/* -------------------------------------------------------------------------- */

export function Notice({
  tone = "info",
  children,
  className,
}: {
  tone?: "info" | "warn" | "danger" | "success" | "neutral";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "bg-info-soft text-info",
    warn: "bg-warn-soft text-warn",
    danger: "bg-danger-soft text-danger",
    success: "bg-success-soft text-success",
    neutral: "bg-neutral-soft text-ink-muted",
  } as const;

  return (
    <div
      className={cn(
        "rounded-[var(--radius-control)] px-3 py-2.5 text-xs leading-relaxed",
        tones[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}
