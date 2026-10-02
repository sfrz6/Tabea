import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { requireActor } from "@/lib/auth/current-user";
import { getTranslator } from "@/lib/i18n/server";
import { zonedParts } from "@/lib/dates";
import { canViewAllTasks } from "@/lib/permissions";
import { getDashboardData } from "@/features/dashboard/queries";
import { MetricTiles } from "@/features/dashboard/components/metric-tiles";
import { TaskCard, TaskCardList } from "@/features/tasks/components/task-card";
import { EmptyState, SectionHeader } from "@/components/ui/surface";
import type { TaskListItem } from "@/features/tasks/queries";
import type { Translator } from "@/lib/i18n/translate";

export const metadata: Metadata = {
  title: "Dashboard",
};

/** Greeting chosen from the hour in the application timezone, not the server's. */
function greetingFor(now: Date, t: Translator, name: string): string {
  const hour = zonedParts(now).hour;
  const template =
    hour < 12
      ? t.dict.dashboard.greetingMorning
      : hour < 17
        ? t.dict.dashboard.greetingAfternoon
        : t.dict.dashboard.greetingEvening;
  return t.fmt(template, { name });
}

function TaskSection({
  title,
  description,
  tasks,
  t,
  now,
  showAssignee,
  moreHref,
  moreLabel,
}: {
  title: string;
  description?: string;
  tasks: TaskListItem[];
  t: Translator;
  now: Date;
  showAssignee: boolean;
  moreHref?: string;
  moreLabel?: string;
}) {
  if (tasks.length === 0) return null;

  const Arrow = t.locale === "ar" ? ArrowLeft : ArrowRight;

  return (
    <section className="space-y-2.5">
      <SectionHeader
        title={title}
        description={description}
        action={
          moreHref ? (
            <Link
              href={moreHref}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand underline-offset-2 hover:underline"
            >
              {moreLabel}
              <Arrow aria-hidden size={13} />
            </Link>
          ) : undefined
        }
      />
      <TaskCardList>
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            t={t}
            now={now}
            showAssignee={showAssignee}
          />
        ))}
      </TaskCardList>
    </section>
  );
}

export default async function DashboardPage() {
  const { user, actor } = await requireActor();
  const t = await getTranslator();
  const now = new Date();

  const data = await getDashboardData(actor, now);
  const seesEverything = canViewAllTasks(actor);
  const basePath = seesEverything ? "/tasks" : "/my-tasks";

  const everythingIsQuiet =
    data.needsAttention.length === 0 &&
    data.dueToday.length === 0 &&
    data.upcoming.length === 0;

  return (
    <div className="space-y-6 lg:space-y-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          {greetingFor(now, t, user.name.split(" ")[0] ?? user.name)}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {seesEverything ? t.dict.dashboard.scopeAll : t.dict.dashboard.scopeOwn}
        </p>
      </header>

      <MetricTiles metrics={data.metrics} t={t} basePath={basePath} />

      {everythingIsQuiet ? (
        <EmptyState
          title={t.dict.dashboard.nothingNeedsAttention}
          description={t.dict.tasks.empty.noneHint}
        />
      ) : null}

      <TaskSection
        title={t.dict.dashboard.needsAttention}
        description={t.dict.dashboard.needsAttentionHint}
        tasks={data.needsAttention}
        t={t}
        now={now}
        showAssignee={seesEverything}
        moreHref={`${basePath}?quick=overdue`}
        moreLabel={t.dict.common.viewAll}
      />

      <TaskSection
        title={t.dict.dashboard.today}
        tasks={data.dueToday}
        t={t}
        now={now}
        showAssignee={seesEverything}
        moreHref={`${basePath}?quick=today`}
        moreLabel={t.dict.common.viewAll}
      />

      <TaskSection
        title={t.dict.dashboard.upcoming}
        tasks={data.upcoming}
        t={t}
        now={now}
        showAssignee={seesEverything}
        moreHref={`${basePath}?quick=upcoming`}
        moreLabel={t.dict.common.viewAll}
      />

      {/* The full history lives on its own screen, so the dashboard stays
          about the work itself. */}
      <TaskSection
        title={t.dict.dashboard.recentlyUpdated}
        tasks={data.recentlyUpdated}
        t={t}
        now={now}
        showAssignee={seesEverything}
        moreHref="/activity"
        moreLabel={t.dict.activity.title}
      />
    </div>
  );
}
