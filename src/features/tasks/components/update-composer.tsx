"use client";

import { useActionState, useId, useRef } from "react";
import { Send } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { validationMessage } from "@/lib/validation/messages";
import { LIMITS } from "@/lib/validation/limits";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/field";
import { Notice } from "@/components/ui/surface";
import { addUpdateAction, type StatusFormState } from "../actions";

/**
 * Posting progress is separate from changing status on purpose. Somebody can
 * report what happened without pretending the work moved on, which is what
 * keeps the history honest.
 */
export function UpdateComposer({ taskId }: { taskId: string }) {
  const t = useI18n();
  const { dict } = t;
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState<StatusFormState | undefined, FormData>(
    async (previous, formData) => {
      const result = await addUpdateAction(previous, formData);
      // Clear the box once the update is recorded, so it is obvious it was sent.
      if (result.ok) formRef.current?.reset();
      return result;
    },
    undefined,
  );

  const contentId = useId();

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const contentError = fieldErrors.content
    ? validationMessage(fieldErrors.content, t)
    : undefined;

  return (
    <form ref={formRef} action={formAction} className="space-y-2.5">
      <input type="hidden" name="taskId" value={taskId} />

      <label htmlFor={contentId} className="sr-only">
        {dict.tasks.addUpdate}
      </label>

      <TextArea
        id={contentId}
        name="content"
        rows={3}
        required
        maxLength={LIMITS.updateContentMax}
        placeholder={dict.tasks.addUpdatePlaceholder}
        invalid={Boolean(contentError)}
        className="bg-surface"
      />

      {contentError ? (
        <p role="alert" className="text-xs text-danger">
          {contentError}
        </p>
      ) : null}

      {state && !state.ok && !contentError ? (
        <Notice tone="danger">
          {state.code === "FORBIDDEN_EDIT"
            ? dict.errors.forbiddenEdit
            : dict.errors.saveFailed}
        </Notice>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={pending}>
          <Send aria-hidden size={16} className="rtl:-scale-x-100" />
          {pending ? dict.tasks.postingUpdate : dict.tasks.postUpdate}
        </Button>
      </div>
    </form>
  );
}
