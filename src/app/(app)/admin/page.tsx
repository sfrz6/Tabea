import type { Metadata } from "next";
import Link from "next/link";
import { getTranslator } from "@/lib/i18n/server";
import { formatNumber } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import { getSystemStats, getWorkloadByUser } from "@/features/users/queries";
import { Card, PageHeader, SectionHeader } from "@/components/ui/surface";
import { Avatar } from "@/components/ui/surface";

export const metadata: Metadata = {
  title: "System overview",
};

export default async function AdminOverviewPage() {
  const t = await getTranslator();
  const { dict, locale } = t;
  const now = new Date();

  const [stats, workload] = await Promise.all([
    getSystemStats(now),
    getWorkloadByUser(now),
  ]);

  const figures = [
    { label: dict.admin.stats.activeUsers, value: stats.activeUsers, tone: "ink" },
    { label: dict.admin.stats.openTasks, value: stats.openTasks, tone: "ink" },
    { label: dict.admin.stats.overdueTasks, value: stats.overdueTasks, tone: "danger" },
    { label: dict.admin.stats.waitingTasks, value: stats.waitingTasks, tone: "warn" },
    { label: dict.admin.stats.completedTasks, value: stats.completedTasks, tone: "success" },
    { label: dict.admin.stats.totalTasks, value: stats.totalTasks, tone: "ink" },
  ] as const;

  const tones = {
    ink: "text-ink",
    danger: "text-danger",
    warn: "text-warn",
    success: "text-success",
  } as const;

  return (
    <div className="space-y-6">
      <PageHeader title={dict.admin.overview} />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {figures.map((figure) => (
          <Card key={figure.label} className="p-3.5">
            <span
              className={cn(
                "block text-2xl font-semibold leading-none tabular",
                figure.value > 0 ? tones[figure.tone] : "text-ink-subtle",
              )}
            >
              {formatNumber(figure.value, locale)}
            </span>
            <span className="mt-1.5 block text-xs leading-tight text-ink-muted">
              {figure.label}
            </span>
          </Card>
        ))}
      </div>

      <section className="space-y-3">
        <SectionHeader title={dict.admin.stats.tasksPerUser} />

        <Card>
          <ul className="divide-y divide-border">
            {workload.map((row) => (
              <li key={row.userId}>
                <Link
                  href={`/tasks?assigneeId=${row.userId}`}
                  className="flex min-h-14 items-center gap-3 px-4 transition-colors hover:bg-surface-sunken"
                >
                  <Avatar name={row.name} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                    {row.name}
                  </span>

                  <span className="shrink-0 text-end">
                    <span className="block text-sm font-medium text-ink tabular">
                      {formatNumber(row.openTasks, locale)}
                    </span>
                    <span className="block text-[0.6875rem] text-ink-subtle">
                      {dict.admin.openTasksCount}
                    </span>
                  </span>

                  <span
                    className={cn(
                      "ms-2 shrink-0 text-end",
                      row.overdueTasks > 0 ? "text-danger" : "text-ink-subtle",
                    )}
                  >
                    <span className="block text-sm font-medium tabular">
                      {formatNumber(row.overdueTasks, locale)}
                    </span>
                    <span className="block text-[0.6875rem]">{dict.admin.overdueCount}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
