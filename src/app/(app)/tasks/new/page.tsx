import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireActor } from "@/lib/auth/current-user";
import { getTranslator } from "@/lib/i18n/server";
import { toDateInputValue } from "@/lib/dates";
import { canAssignToOthers, canCreateTasks } from "@/lib/permissions";
import {
  getActiveCategories,
  getActiveProjects,
  getAssignableUsers,
} from "@/features/tasks/queries";
import { TaskForm } from "@/features/tasks/components/task-form";
import { PageHeader } from "@/components/ui/surface";

export const metadata: Metadata = {
  title: "New task",
};

export default async function NewTaskPage() {
  const { user, actor } = await requireActor();

  // The route is closed to anybody who cannot raise work, and createTask
  // repeats the same check before it writes.
  if (!canCreateTasks(actor)) notFound();

  const t = await getTranslator();

  const [assignees, projects, categories] = await Promise.all([
    getAssignableUsers(),
    getActiveProjects(),
    getActiveCategories(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title={t.dict.tasks.newTask} />

      <TaskForm
        mode="create"
        currentUserId={user.id}
        canAssignToOthers={canAssignToOthers(actor)}
        assignees={assignees}
        projects={projects}
        categories={categories}
        values={{
          title: "",
          description: "",
          assignedToId: user.id,
          priority: "MEDIUM",
          // Defaults to today, which is the most common answer and saves a tap.
          dueDate: toDateInputValue(new Date()),
          dueTime: "",
          projectId: "",
          categoryId: "",
          location: "",
          participantIds: [],
        }}
      />
    </div>
  );
}
