import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireActor } from "@/lib/auth/current-user";
import { getTranslator } from "@/lib/i18n/server";
import { isAppError } from "@/lib/errors";
import { toDateInputValue, toTimeInputValue } from "@/lib/dates";
import { canAssignToOthers, canEditTask } from "@/lib/permissions";
import {
  getActiveCategories,
  getActiveProjects,
  getAssignableUsers,
  getTaskDetail,
} from "@/features/tasks/queries";
import { TaskForm } from "@/features/tasks/components/task-form";
import { PageHeader } from "@/components/ui/surface";

export const metadata: Metadata = {
  title: "Edit task",
};

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, actor } = await requireActor();
  const t = await getTranslator();

  let task;
  try {
    task = await getTaskDetail(actor, id);
  } catch (error) {
    if (isAppError(error) && error.code === "TASK_NOT_FOUND") notFound();
    throw error;
  }

  // Viewing and editing are separate rights. Somebody with full visibility who
  // cannot edit this task is sent away here, and editTask repeats the check.
  if (
    !canEditTask(actor, {
      createdById: task.createdBy.id,
      assignedToId: task.assignedTo.id,
      status: task.status,
      participantIds: task.participants.map((participant) => participant.id),
    })
  ) {
    notFound();
  }

  const [assignees, projects, categories] = await Promise.all([
    getAssignableUsers(),
    getActiveProjects(),
    getActiveCategories(),
  ]);

  // An assignee who has since been deactivated stays selectable, so editing
  // another field does not silently move the task to somebody else.
  const options = assignees.some((person) => person.id === task.assignedTo.id)
    ? assignees
    : [{ id: task.assignedTo.id, name: task.assignedTo.name, role: "MEMBER" as const }, ...assignees];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title={t.dict.tasks.editTask} description={task.title} />

      <TaskForm
        mode="edit"
        currentUserId={user.id}
        canAssignToOthers={canAssignToOthers(actor)}
        assignees={options}
        projects={projects}
        categories={categories}
        values={{
          taskId: task.id,
          title: task.title,
          description: task.description ?? "",
          assignedToId: task.assignedTo.id,
          priority: task.priority,
          dueDate: toDateInputValue(task.dueDate),
          dueTime: toTimeInputValue(task.dueDate),
          projectId: task.projectId ?? "",
          categoryId: task.categoryId ?? "",
          location: task.location ?? "",
          participantIds: task.participants.map((participant) => participant.id),
        }}
      />
    </div>
  );
}
