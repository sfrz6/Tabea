"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";
import { LIMITS } from "@/lib/validation/limits";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { TextArea } from "@/components/ui/field";
import { Notice } from "@/components/ui/surface";
import type { TaskCapabilities } from "@/lib/permissions";
import {
  cancelTaskAction,
  completeTaskAction,
  reopenTaskAction,
  type StatusFormState,
} from "../actions";

/**
 * The actions that close or reopen a task. Completing is a single tap, because
 * it is the common case and is fully recorded anyway. Cancelling and reopening
 * ask first, because they change what the record says about whether work was
 * ever required.
 */
export function TaskActions({
  taskId,
  capabilities,
}: {
  taskId: string;
  capabilities: TaskCapabilities;
}) {
  const { dict } = useI18n();

  const [completeState, completeAction, completing] = useActionState<
    StatusFormState | undefined,
    FormData
  >(completeTaskAction, undefined);

  const failed = completeState && !completeState.ok;

  if (!capabilities.complete && !capabilities.reopen && !capabilities.cancel) {
    return null;
  }

  return (
    <div className="space-y-2">
      {failed ? <Notice tone="danger">{dict.errors.saveFailed}</Notice> : null}

      <div className="flex flex-wrap gap-2">
        {capabilities.complete ? (
          <form action={completeAction} className="flex-1 sm:flex-none">
            <input type="hidden" name="taskId" value={taskId} />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={completing}
            >
              <CheckCircle2 aria-hidden size={18} />
              {completing ? dict.tasks.completing : dict.tasks.markComplete}
            </Button>
          </form>
        ) : null}

        {capabilities.reopen ? (
          <ConfirmAction
            taskId={taskId}
            action={reopenTaskAction}
            label={dict.tasks.reopen}
            title={dict.tasks.reopenConfirmTitle}
            body={dict.tasks.reopenConfirmBody}
            icon={<RotateCcw aria-hidden size={18} />}
            variant="secondary"
          />
        ) : null}

        {capabilities.cancel ? (
          <ConfirmAction
            taskId={taskId}
            action={cancelTaskAction}
            label={dict.tasks.cancelTask}
            title={dict.tasks.cancelConfirmTitle}
            body={dict.tasks.cancelConfirmBody}
            icon={<XCircle aria-hidden size={18} />}
            variant="danger"
            reasonLabel={dict.tasks.cancelReason}
          />
        ) : null}
      </div>
    </div>
  );
}

function ConfirmAction({
  taskId,
  action,
  label,
  title,
  body,
  icon,
  variant,
  reasonLabel,
}: {
  taskId: string;
  action: (
    previous: StatusFormState | undefined,
    formData: FormData,
  ) => Promise<StatusFormState>;
  label: string;
  title: string;
  body: string;
  icon: React.ReactNode;
  variant: "secondary" | "danger";
  reasonLabel?: string;
}) {
  const { dict } = useI18n();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<StatusFormState | undefined, FormData>(
    async (previous, formData) => {
      const result = await action(previous, formData);
      if (result.ok) setOpen(false);
      return result;
    },
    undefined,
  );

  const formId = `confirm-${label.replace(/\s+/g, "-")}`;

  return (
    <>
      <Button
        variant={variant}
        size="lg"
        onClick={() => setOpen(true)}
        className={cn("flex-1 sm:flex-none")}
      >
        {icon}
        {label}
      </Button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={body}
        size="sm"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {dict.common.cancel}
            </Button>
            <Button
              type="submit"
              form={formId}
              variant={variant === "danger" ? "danger" : "primary"}
              disabled={pending}
            >
              {pending ? dict.common.saving : dict.common.confirm}
            </Button>
          </>
        }
      >
        <form id={formId} action={formAction} className="space-y-3 pb-2">
          <input type="hidden" name="taskId" value={taskId} />

          {reasonLabel ? (
            <div className="space-y-1.5">
              <label htmlFor={`${formId}-reason`} className="block text-sm font-medium text-ink">
                {reasonLabel}
              </label>
              <TextArea
                id={`${formId}-reason`}
                name="reason"
                rows={3}
                maxLength={LIMITS.waitingReasonMax}
              />
            </div>
          ) : null}

          {state && !state.ok ? (
            <Notice tone="danger">{dict.errors.saveFailed}</Notice>
          ) : null}
        </form>
      </Modal>
    </>
  );
}
