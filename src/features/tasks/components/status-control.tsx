"use client";

import { useActionState, useId, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";
import { validationMessage } from "@/lib/validation/messages";
import { LIMITS } from "@/lib/validation/limits";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Notice } from "@/components/ui/surface";
import { TextArea } from "@/components/ui/field";
import type { TaskStatus } from "@/db/schema";
import { changeStatusAction, type StatusFormState } from "../actions";
import { StatusBadge } from "./badges";

/** Cancelled is reached through its own confirmed action, not this picker. */
const SELECTABLE: TaskStatus[] = ["NEW", "IN_PROGRESS", "WAITING", "COMPLETED"];

/**
 * Status changes are the thing people do most often from a phone, so this is
 * deliberately two taps: open the picker, choose the status. Only Waiting adds
 * a step, because a blocked task without a reason is exactly the situation
 * Tabea exists to prevent.
 */
export function StatusControl({
  taskId,
  status,
  waitingReason,
  disabled = false,
}: {
  taskId: string;
  status: TaskStatus;
  waitingReason: string | null;
  disabled?: boolean;
}) {
  const t = useI18n();
  const { dict } = t;

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<TaskStatus>(status);

  // The sheet closes from inside the action rather than from an effect watching
  // its result, which avoids a second render pass after every change.
  const [state, formAction, pending] = useActionState<StatusFormState | undefined, FormData>(
    async (previous, formData) => {
      const result = await changeStatusAction(previous, formData);
      if (result.ok) setOpen(false);
      return result;
    },
    undefined,
  );

  const reasonId = useId();

  function openSheet(): void {
    // Start from the status the task actually holds, not a stale choice.
    setSelected(status);
    setOpen(true);
  }

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const reasonError = fieldErrors.waitingReason
    ? validationMessage(fieldErrors.waitingReason, t)
    : undefined;

  const needsReason = selected === "WAITING";

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        disabled={disabled}
        aria-label={t.fmt(dict.a11y.statusLabel, { status: dict.status[status] })}
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)]",
          "border border-border bg-surface px-3 transition-colors",
          "hover:border-border-strong disabled:opacity-60 disabled:hover:border-border",
        )}
      >
        <StatusBadge status={status} label={dict.status[status]} />
        {!disabled ? (
          <ChevronDown aria-hidden size={16} className="text-ink-subtle" />
        ) : null}
      </button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={dict.tasks.changeStatus}
        footer={
          needsReason ? (
            <>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {dict.common.cancel}
              </Button>
              {/* The chosen status travels on the submit button itself, so no
                  hidden field can fall out of step with what was tapped. */}
              <Button
                type="submit"
                form="status-form"
                name="status"
                value="WAITING"
                variant="primary"
                disabled={pending}
              >
                {pending ? dict.common.saving : dict.common.save}
              </Button>
            </>
          ) : undefined
        }
      >
        <form id="status-form" action={formAction} className="space-y-2 pb-2">
          <input type="hidden" name="taskId" value={taskId} />

          <div className="space-y-1.5">
            {SELECTABLE.map((option) => {
              const active = selected === option;

              return (
                <button
                  key={option}
                  // Everything except Waiting is a one tap change. Waiting
                  // only selects, because it still needs its reason.
                  type={option === "WAITING" ? "button" : "submit"}
                  {...(option === "WAITING" ? {} : { name: "status", value: option })}
                  onClick={() => setSelected(option)}
                  disabled={pending}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[var(--radius-control)] border p-3 text-start",
                    "transition-colors disabled:opacity-60",
                    active
                      ? "border-brand bg-brand-soft"
                      : "border-border bg-surface hover:border-border-strong",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">
                      {dict.status[option]}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-subtle">
                      {dict.statusDescription[option]}
                    </span>
                  </span>
                  {active ? (
                    <Check aria-hidden size={18} className="shrink-0 text-brand" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {needsReason ? (
            <div className="space-y-2 pt-2">
              <label htmlFor={reasonId} className="block text-sm font-medium text-ink">
                {dict.tasks.fields.waitingReason}
              </label>
              <TextArea
                id={reasonId}
                name="waitingReason"
                defaultValue={waitingReason ?? ""}
                placeholder={dict.tasks.fields.waitingReasonPlaceholder}
                maxLength={LIMITS.waitingReasonMax}
                rows={3}
                required
                invalid={Boolean(reasonError)}
                autoFocus
              />
              {reasonError ? (
                <p role="alert" className="text-xs text-danger">
                  {reasonError}
                </p>
              ) : (
                <p className="text-xs leading-relaxed text-ink-subtle">
                  {dict.tasks.waitingReasonRequired}
                </p>
              )}
            </div>
          ) : null}

          {state && !state.ok && !reasonError ? (
            <Notice tone="danger">
              {state.code === "FORBIDDEN_EDIT"
                ? dict.errors.forbiddenEdit
                : dict.errors.saveFailed}
            </Notice>
          ) : null}
        </form>
      </Modal>
    </>
  );
}
