import type { Metadata } from "next";
import { requireActor } from "@/lib/auth/current-user";
import { getTranslator } from "@/lib/i18n/server";
import { taskFiltersSchema } from "@/lib/validation/schemas";
import {
  getActiveCategories,
  getActiveProjects,
  listTasks,
} from "@/features/tasks/queries";
import { TaskFilters } from "@/features/tasks/components/task-filters";
import { TaskListView } from "@/features/tasks/components/task-list-view";
import { PageHeader } from "@/components/ui/surface";

export const metadata: Metadata = {
  title: "My Tasks",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Work assigned to the signed in person, whatever their visibility setting. It
 * is the screen a member opens first, so the quick filters sit above the list
 * and nothing else competes for the space.
 */
export default async function MyTasksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { actor } = await requireActor();
  const t = await getTranslator();
  const now = new Date();

  const raw = await searchParams;
  // Unknown or malformed query values fall back to the defaults rather than
  // reaching the database.
  const filters = taskFiltersSchema.parse({
    quick: raw.quick ?? "all",
    status: raw.status || undefined,
    priority: raw.priority || undefined,
    projectId: raw.projectId || undefined,
    categoryId: raw.categoryId || undefined,
    search: raw.search || undefined,
    sort: raw.sort ?? "dueDate",
    page: raw.page ?? 1,
  });

  const [result, projects, categories] = await Promise.all([
    listTasks(actor, filters, "mine", now),
    getActiveProjects(),
    getActiveCategories(),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title={t.dict.tasks.myTasksTitle} />

      <TaskFilters
        assignees={[]}
        projects={projects}
        categories={categories}
        showAssigneeFilter={false}
        resultCount={result.total}
      />

      <TaskListView
        result={result}
        filters={filters}
        t={t}
        basePath="/my-tasks"
        showAssignee={false}
        now={now}
      />
    </div>
  );
}
