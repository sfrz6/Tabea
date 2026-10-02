"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";
import { formatDateTime, formatRelativeTime } from "@/lib/i18n/format";
import { LIMITS } from "@/lib/validation/limits";
import { UPDATE_EDIT_WINDOW_MINUTES } from "@/lib/permissions";
import { Avatar, EmptyState } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/field";
import { editUpdateAction, type StatusFormState } from "../actions";

export type UpdateEntryView = {
  id: string;
  content: string;
  createdAt: Date;
  editedAt: Date | null;
  authorName: string;
  canEdit: boolean;
};

/**
 * The conversation on a task. Updates are never removed and never silently
 * rewritten: an author has a short window to correct wording, after which the
 * entry is fixed, and any correction is marked and kept in the history.
 */
export function UpdateList({
  taskId,
  updates,
}: {
  taskId: string;
  updates: UpdateEntryView[];
}) {
  const { dict } = useI18n();

  if (updates.length === 0) {
    return <EmptyState title={dict.tasks.noUpdatesYet} />;
  }

  return (
    <ol className="space-y-3">
      {updates.map((update) => (
        <UpdateRow key={update.id} taskId={taskId} update={update} />
      ))}
    </ol>
  );
}

function UpdateRow({ taskId, update }: { taskId: string; update: UpdateEntryView }) {
  const t = useI18n();
  const { dict } = t;
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<StatusFormState | undefined, FormData>(
    async (previous, formData) => {
      const result = await editUpdateAction(previous, formData);
      if (result.ok) setEditing(false);
      return result;
    },
    undefined,
  );

  return (
    <li className="rounded-[var(--radius-card)] border border-border bg-surface p-3.5">
      <div className="flex items-center gap-2.5">
        <Avatar name={update.authorName} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{update.authorName}</p>
          <p className="text-xs text-ink-subtle">
            <time dateTime={update.createdAt.toISOString()} title={formatDateTime(update.createdAt, t.locale)}>
              {formatRelativeTime(update.createdAt, t)}
            </time>
            {update.editedAt ? (
              <span className="ms-1.5 text-ink-subtle">({dict.tasks.updateEdited})</span>
            ) : null}
          </p>
        </div>

        {update.canEdit && !editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={dict.tasks.editUpdate}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            <Pencil aria-hidden size={15} />
          </button>
        ) : null}
      </div>

      {editing ? (
        <form action={formAction} className="mt-3 space-y-2">
          <input type="hidden" name="updateId" value={update.id} />
          <input type="hidden" name="taskId" value={taskId} />

          <TextArea
            id={`edit-${update.id}`}
            name="content"
            defaultValue={update.content}
            rows={3}
            maxLength={LIMITS.updateContentMax}
            required
            autoFocus
          />

          {state && !state.ok ? (
            <p role="alert" className="text-xs text-danger">
              {state.code === "FORBIDDEN_EDIT"
                ? t.fmt(dict.tasks.editWindowClosed, {
                    minutes: UPDATE_EDIT_WINDOW_MINUTES,
                  })
                : dict.errors.saveFailed}
            </p>
          ) : (
            <p className="text-xs leading-relaxed text-ink-subtle">
              {t.fmt(dict.tasks.editWindowClosed, { minutes: UPDATE_EDIT_WINDOW_MINUTES })}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              {dict.common.cancel}
            </Button>
            <Button type="submit" size="sm" variant="primary" disabled={pending}>
              {pending ? dict.common.saving : dict.common.save}
            </Button>
          </div>
        </form>
      ) : (
        <p
          className={cn(
            "mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-ink wrap-anywhere",
          )}
        >
          {update.content}
        </p>
      )}
    </li>
  );
}
