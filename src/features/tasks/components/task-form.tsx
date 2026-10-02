"use client";

import { useActionState, useId } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { validationMessage } from "@/lib/validation/messages";
import { LIMITS } from "@/lib/validation/limits";
import { Button } from "@/components/ui/button";
import { Field, Select, TextArea, TextInput } from "@/components/ui/field";
import { Notice } from "@/components/ui/surface";
import type { TaskPriority } from "@/db/schema";
import { createTaskAction, editTaskAction, type TaskFormState } from "../actions";
import type { AssignableUser, TaxonomyOption } from "../queries";

const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export type TaskFormValues = {
  taskId?: string;
  title: string;
  description: string;
  assignedToId: string;
  priority: TaskPriority;
  dueDate: string;
  dueTime: string;
  projectId: string;
  categoryId: string;
  location: string;
  participantIds: string[];
};

/**
 * One form for creating and for editing. The required fields come first and
 * fit on a phone screen without scrolling, and everything optional sits behind
 * a disclosure, so assigning a task stays a short job.
 */
export function TaskForm({
  mode,
  values,
  assignees,
  projects,
  categories,
  canAssignToOthers,
  currentUserId,
}: {
  mode: "create" | "edit";
  values: TaskFormValues;
  assignees: AssignableUser[];
  projects: TaxonomyOption[];
  categories: TaxonomyOption[];
  canAssignToOthers: boolean;
  currentUserId: string;
}) {
  const t = useI18n();
  const { dict, locale } = t;

  const [state, formAction, pending] = useActionState<TaskFormState | undefined, FormData>(
    mode === "create" ? createTaskAction : editTaskAction,
    undefined,
  );

  const titleId = useId();
  const assigneeId = useId();
  const priorityId = useId();
  const dueDateId = useId();
  const dueTimeId = useId();
  const descriptionId = useId();
  const projectId = useId();
  const categoryId = useId();
  const locationId = useId();

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const errorOf = (field: string): string | undefined =>
    fieldErrors[field] ? validationMessage(fieldErrors[field], t) : undefined;

  const formError =
    state && !state.ok && !Object.keys(fieldErrors).length
      ? dict.errors.saveFailed
      : fieldErrors.form
        ? validationMessage(fieldErrors.form, t)
        : undefined;

  const optionLabel = (option: TaxonomyOption): string =>
    locale === "ar" && option.nameAr ? option.nameAr : option.name;

  const participantCandidates = assignees.filter(
    (person) => person.id !== values.assignedToId,
  );

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {values.taskId ? <input type="hidden" name="taskId" value={values.taskId} /> : null}

      {formError ? <Notice tone="danger">{formError}</Notice> : null}

      <Field
        htmlFor={titleId}
        label={dict.tasks.fields.title}
        error={errorOf("title")}
        required
        requiredLabel={dict.a11y.requiredField}
      >
        <TextInput
          id={titleId}
          name="title"
          defaultValue={values.title}
          placeholder={dict.tasks.fields.titlePlaceholder}
          maxLength={LIMITS.taskTitleMax}
          required
          autoComplete="off"
          enterKeyHint="next"
          invalid={Boolean(fieldErrors.title)}
        />
      </Field>

      <Field
        htmlFor={assigneeId}
        label={dict.tasks.fields.assignee}
        error={errorOf("assignedToId")}
        required
        requiredLabel={dict.a11y.requiredField}
      >
        {canAssignToOthers ? (
          <Select
            id={assigneeId}
            name="assignedToId"
            defaultValue={values.assignedToId || currentUserId}
            required
            invalid={Boolean(fieldErrors.assignedToId)}
          >
            {assignees.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </Select>
        ) : (
          <>
            {/* Without the right to assign to others, the task stays with its author. */}
            <input type="hidden" name="assignedToId" value={currentUserId} />
            <div className="flex min-h-11 items-center rounded-[var(--radius-control)] border border-border bg-surface-sunken px-3 text-sm text-ink-muted">
              {assignees.find((person) => person.id === currentUserId)?.name ??
                dict.common.you}
            </div>
          </>
        )}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          htmlFor={priorityId}
          label={dict.tasks.fields.priority}
          error={errorOf("priority")}
          required
          requiredLabel={dict.a11y.requiredField}
        >
          <Select
            id={priorityId}
            name="priority"
            defaultValue={values.priority}
            invalid={Boolean(fieldErrors.priority)}
          >
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {dict.priority[priority]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          htmlFor={dueDateId}
          label={dict.tasks.fields.dueDate}
          error={errorOf("dueDate")}
          required
          requiredLabel={dict.a11y.requiredField}
        >
          {/* A native date input opens the iOS wheel picker, which beats any
              custom calendar on a phone and needs no JavaScript. */}
          <TextInput
            id={dueDateId}
            name="dueDate"
            type="date"
            defaultValue={values.dueDate}
            required
            invalid={Boolean(fieldErrors.dueDate)}
          />
        </Field>
      </div>

      {/* Project sits on the main form rather than behind the disclosure,
          because work here is nearly always filed against one and a manager
          should not have to open a panel to say which. */}
      {projects.length > 0 ? (
        <Field htmlFor={projectId} label={dict.tasks.fields.project}>
          <Select id={projectId} name="projectId" defaultValue={values.projectId}>
            <option value="">{dict.common.none}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {optionLabel(project)}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <Field
        htmlFor={descriptionId}
        label={dict.tasks.fields.description}
        error={errorOf("description")}
      >
        <TextArea
          id={descriptionId}
          name="description"
          defaultValue={values.description}
          placeholder={dict.tasks.fields.descriptionPlaceholder}
          maxLength={LIMITS.taskDescriptionMax}
          rows={4}
          invalid={Boolean(fieldErrors.description)}
        />
      </Field>

      <details className="group rounded-[var(--radius-card)] border border-border bg-surface">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 text-sm font-medium text-ink">
          {dict.tasks.moreOptions}
          <ChevronDown
            aria-hidden
            size={18}
            className="text-ink-subtle transition-transform group-open:rotate-180"
          />
        </summary>

        <div className="space-y-5 border-t border-border p-4">
          <Field htmlFor={dueTimeId} label={dict.tasks.fields.dueTime}>
            <TextInput
              id={dueTimeId}
              name="dueTime"
              type="time"
              defaultValue={values.dueTime}
              invalid={Boolean(fieldErrors.dueTime)}
            />
          </Field>

          {categories.length > 0 ? (
            <Field htmlFor={categoryId} label={dict.tasks.fields.category}>
              <Select id={categoryId} name="categoryId" defaultValue={values.categoryId}>
                <option value="">{dict.common.none}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {optionLabel(category)}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <Field htmlFor={locationId} label={dict.tasks.fields.location}>
            <TextInput
              id={locationId}
              name="location"
              defaultValue={values.location}
              placeholder={dict.tasks.fields.locationPlaceholder}
              maxLength={LIMITS.taskLocationMax}
              autoComplete="off"
            />
          </Field>

          {canAssignToOthers && participantCandidates.length > 0 ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-ink">
                {dict.tasks.fields.participants}
              </legend>
              <p className="text-xs leading-relaxed text-ink-subtle">
                {dict.tasks.fields.participantsHint}
              </p>
              <div className="space-y-1.5 pt-1">
                {participantCandidates.map((person) => (
                  <label
                    key={person.id}
                    className="flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] border border-border px-3"
                  >
                    <input
                      type="checkbox"
                      name="participantIds"
                      value={person.id}
                      defaultChecked={values.participantIds.includes(person.id)}
                      className="size-5 accent-brand"
                    />
                    <span className="truncate text-sm text-ink">{person.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
        </div>
      </details>

      <div className="flex flex-col gap-2 pt-1 sm:flex-row-reverse sm:justify-start">
        <Button type="submit" variant="primary" size="lg" disabled={pending} fullWidth>
          {pending
            ? mode === "create"
              ? dict.tasks.creatingTask
              : dict.common.saving
            : mode === "create"
              ? dict.tasks.createTask
              : dict.common.save}
        </Button>
        <Button asChild variant="ghost" size="lg" fullWidth>
          <Link href={values.taskId ? `/tasks/${values.taskId}` : "/my-tasks"}>
            {dict.common.cancel}
          </Link>
        </Button>
      </div>
    </form>
  );
}
