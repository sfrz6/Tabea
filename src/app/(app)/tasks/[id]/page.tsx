import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requireActor } from "@/lib/auth/current-user";
import { getTranslator } from "@/lib/i18n/server";
import { isAppError } from "@/lib/errors";
import { isOverdue, wasCompletedLate } from "@/lib/dates";
import { formatDate, formatDateTime, formatOverdue } from "@/lib/i18n/format";
import { getTaskDetail } from "@/features/tasks/queries";
import { StatusControl } from "@/features/tasks/components/status-control";
import { TaskActions } from "@/features/tasks/components/task-actions";
import { UpdateComposer } from "@/features/tasks/components/update-composer";
import { UpdateList } from "@/features/tasks/components/update-list";
import { TaskTimeline } from "@/features/tasks/components/task-timeline";
import {
  MetaPill,
  OverdueBadge,
  PriorityIndicator,
} from "@/features/tasks/components/badges";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  Card,
  MetaList,
  MetaRow,
  Notice,
  SectionHeader,
} from "@/components/ui/surface";

export const metadata: Metadata = {
  title: "Task",
};

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { actor } = await requireActor();
  const t = await getTranslator();
  const now = new Date();

  // getTaskDetail reports a task the actor may not see as missing, so this page
  // never confirms that a hidden task exists.
  let task;
  try {
    task = await getTaskDetail(actor, id, now);
  } catch (error) {
    if (isAppError(error) && error.code === "TASK_NOT_FOUND") notFound();
    throw error;
  }

  const { dict, locale } = t;
  const overdue = isOverdue({ dueDate: task.dueDate, status: task.status }, now);
  const completedLate = wasCompletedLate(task);

  const projectLabel =
    locale === "ar" ? (task.project?.nameAr ?? task.project?.name) : task.project?.name;
  const categoryLabel =
    locale === "ar" ? (task.category?.nameAr ?? task.category?.name) : task.category?.name;

  return (
    <div className="space-y-6 pb-4">
      {/* -------------------------------- Header ------------------------------- */}
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-semibold leading-snug tracking-tight text-ink wrap-anywhere sm:text-2xl">
            {task.title}
          </h1>

          {task.capabilities.edit ? (
            <Button asChild variant="ghost" size="sm" className="shrink-0">
              <Link href={`/tasks/${task.id}/edit`}>
                <Pencil aria-hidden size={15} />
                <span className="hidden sm:inline">{dict.common.edit}</span>
              </Link>
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <StatusControl
            taskId={task.id}
            status={task.status}
            waitingReason={task.waitingReason}
            disabled={!task.capabilities.changeStatus}
          />

          <PriorityIndicator
            priority={task.priority}
            label={dict.priority[task.priority]}
            showLabel
          />

          {overdue ? <OverdueBadge label={formatOverdue(task.dueDate, t, now)} /> : null}
        </div>

        {task.status === "WAITING" && task.waitingReason ? (
          <Notice tone="warn">
            <span className="font-semibold">{dict.tasks.fields.waitingReason}: </span>
            {task.waitingReason}
          </Notice>
        ) : null}

        {task.status === "COMPLETED" ? (
          <Notice tone={completedLate ? "warn" : "success"}>
            {completedLate ? dict.tasks.completedLate : dict.tasks.completedOnTime}
            {task.completedAt ? ` · ${formatDateTime(task.completedAt, locale)}` : null}
          </Notice>
        ) : null}

        {!task.assignedTo.isActive ? (
          <Notice tone="neutral">{dict.errors.userInactive}</Notice>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
        {/* ------------------------------ Main column ---------------------------- */}
        <div className="order-2 space-y-6 lg:order-1">
          {task.description ? (
            <section className="space-y-2">
              <SectionHeader title={dict.tasks.fields.description} />
              <Card className="p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink wrap-anywhere">
                  {task.description}
                </p>
              </Card>
            </section>
          ) : null}

          <section className="space-y-3">
            <SectionHeader
              title={dict.tasks.updates}
              description={t.plural(dict.tasks.updatesCount, task.updates.length)}
            />

            {task.capabilities.addUpdate ? <UpdateComposer taskId={task.id} /> : null}

            <UpdateList
              taskId={task.id}
              updates={task.updates.map((update) => ({
                id: update.id,
                content: update.content,
                createdAt: update.createdAt,
                editedAt: update.editedAt,
                authorName: update.author.name,
                canEdit: update.canEdit,
              }))}
            />
          </section>

          <section className="space-y-3">
            <SectionHeader title={dict.tasks.activityTimeline} />
            <Card className="p-4">
              <TaskTimeline entries={task.activities} t={t} now={now} />
            </Card>
          </section>
        </div>

        {/* ---------------------------- Details column --------------------------- */}
        <div className="order-1 space-y-4 lg:order-2">
          <Card className="px-4">
            <MetaList>
              <MetaRow label={dict.tasks.fields.assignee}>
                <span className="inline-flex items-center gap-2">
                  <Avatar name={task.assignedTo.name} size="xs" />
                  {task.assignedTo.name}
                </span>
              </MetaRow>

              <MetaRow label={dict.tasks.fields.dueDate}>
                <span className={overdue ? "font-medium text-danger" : undefined}>
                  {formatDateTime(task.dueDate, locale)}
                </span>
              </MetaRow>

              <MetaRow label={dict.tasks.fields.creator}>{task.createdBy.name}</MetaRow>

              {task.assignedBy && task.assignedBy.id !== task.createdBy.id ? (
                <MetaRow label={dict.tasks.fields.assignedBy}>
                  {task.assignedBy.name}
                </MetaRow>
              ) : null}

              <MetaRow label={dict.tasks.fields.createdAt}>
                {formatDate(task.createdAt, locale)}
              </MetaRow>

              {task.startedAt ? (
                <MetaRow label={dict.tasks.fields.startedAt}>
                  {formatDate(task.startedAt, locale)}
                </MetaRow>
              ) : null}

              {task.completedAt ? (
                <MetaRow label={dict.tasks.fields.completedAt}>
                  {formatDateTime(task.completedAt, locale)}
                </MetaRow>
              ) : null}

              {task.cancelledAt ? (
                <MetaRow label={dict.tasks.fields.cancelledAt}>
                  {formatDateTime(task.cancelledAt, locale)}
                </MetaRow>
              ) : null}

              {projectLabel ? (
                <MetaRow label={dict.tasks.fields.project}>{projectLabel}</MetaRow>
              ) : null}

              {categoryLabel ? (
                <MetaRow label={dict.tasks.fields.category}>{categoryLabel}</MetaRow>
              ) : null}

              {task.location ? (
                <MetaRow label={dict.tasks.fields.location}>{task.location}</MetaRow>
              ) : null}

              {task.participants.length > 0 ? (
                <MetaRow label={dict.tasks.fields.participants}>
                  <span className="flex flex-wrap justify-end gap-1.5">
                    {task.participants.map((participant) => (
                      <MetaPill key={participant.id}>{participant.name}</MetaPill>
                    ))}
                  </span>
                </MetaRow>
              ) : null}
            </MetaList>
          </Card>

          <TaskActions taskId={task.id} capabilities={task.capabilities} />
        </div>
      </div>
    </div>
  );
}
