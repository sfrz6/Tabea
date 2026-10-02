import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { requireActor } from "@/lib/auth/current-user";
import { getTranslator } from "@/lib/i18n/server";
import { canCreateTasks, canViewAllTasks } from "@/lib/permissions";
import { taskFiltersSchema } from "@/lib/validation/schemas";
import {
  getActiveCategories,
  getActiveProjects,
  getFilterableUsers,
  listTasks,
} from "@/features/tasks/queries";
import { TaskFilters } from "@/features/tasks/components/task-filters";
import { TaskListView } from "@/features/tasks/components/task-list-view";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/surface";

export const metadata: Metadata = {
  title: "All Tasks",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Every task the person is allowed to read. The route is closed to anybody
 * without full visibility, and the query underneath applies the same rule
 * again, so reaching this URL directly gains nothing.
 */
export default async function AllTasksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { actor } = await requireActor();

  if (!canViewAllTasks(actor)) notFound();

  const t = await getTranslator();
  const now = new Date();

  const raw = await searchParams;
  const filters = taskFiltersSchema.parse({
    quick: raw.quick ?? "all",
    status: raw.status || undefined,
    priority: raw.priority || undefined,
    assigneeId: raw.assigneeId || undefined,
    projectId: raw.projectId || undefined,
    categoryId: raw.categoryId || undefined,
    search: raw.search || undefined,
    sort: raw.sort ?? "dueDate",
    page: raw.page ?? 1,
  });

  const [result, people, projects, categories] = await Promise.all([
    listTasks(actor, filters, "all", now),
    getFilterableUsers(),
    getActiveProjects(),
    getActiveCategories(),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.dict.tasks.allTasksTitle}
        action={
          canCreateTasks(actor) ? (
            <Button asChild variant="primary" className="hidden lg:inline-flex">
              <Link href="/tasks/new">
                <Plus aria-hidden size={17} />
                {t.dict.tasks.newTask}
              </Link>
            </Button>
          ) : undefined
        }
      />

      <TaskFilters
        assignees={people}
        projects={projects}
        categories={categories}
        showAssigneeFilter
        resultCount={result.total}
      />

      <TaskListView
        result={result}
        filters={filters}
        t={t}
        basePath="/tasks"
        showAssignee
        now={now}
      />
    </div>
  );
}
