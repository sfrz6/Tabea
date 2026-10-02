import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Translator } from "@/lib/i18n/translate";
import { formatNumber } from "@/lib/i18n/format";
import type { DashboardMetrics } from "../queries";

type Tile = {
  key: string;
  label: string;
  value: number;
  href: string;
  tone: "danger" | "warn" | "brand";
};

/**
 * Three numbers, not five. On a phone the dashboard has to put work in front of
 * the reader quickly, so only the figures that demand a decision get a tile:
 * what has slipped, what is blocked and what is due today. The rest sit on one
 * quiet line underneath.
 *
 * Each tile is a link into the matching filtered list, which turns a number into
 * something actionable rather than decoration.
 */
export function MetricTiles({
  metrics,
  t,
  basePath,
}: {
  metrics: DashboardMetrics;
  t: Translator;
  basePath: "/my-tasks" | "/tasks";
}) {
  const { dict, locale } = t;

  const tiles: Tile[] = [
    {
      key: "overdue",
      label: dict.dashboard.metrics.overdue,
      value: metrics.overdue,
      href: `${basePath}?quick=overdue`,
      tone: "danger",
    },
    {
      key: "waiting",
      label: dict.dashboard.metrics.waiting,
      value: metrics.waiting,
      href: `${basePath}?status=WAITING`,
      tone: "warn",
    },
    {
      key: "dueToday",
      label: dict.dashboard.metrics.dueToday,
      value: metrics.dueToday,
      href: `${basePath}?quick=today`,
      tone: "brand",
    },
  ];

  const tones = {
    danger: "text-danger",
    warn: "text-warn",
    brand: "text-brand",
  } as const;

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-2.5">
        {tiles.map((tile) => (
          <Link
            key={tile.key}
            href={tile.href}
            className={cn(
              "rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-card",
              "transition-colors hover:border-border-strong",
            )}
          >
            <span
              className={cn(
                "block text-2xl font-semibold leading-none tabular",
                tile.value > 0 ? tones[tile.tone] : "text-ink-subtle",
              )}
            >
              {formatNumber(tile.value, locale)}
            </span>
            <span className="mt-1.5 block text-xs leading-tight text-ink-muted">
              {tile.label}
            </span>
          </Link>
        ))}
      </div>

      <p className="px-0.5 text-xs text-ink-subtle">
        <span className="tabular">{formatNumber(metrics.open, locale)}</span>{" "}
        {dict.dashboard.metrics.open}
        {" · "}
        <span className="tabular">{formatNumber(metrics.completedThisWeek, locale)}</span>{" "}
        {dict.dashboard.metrics.completedThisWeek}
      </p>
    </div>
  );
}
