"use client";

import { useActionState, useId, useState } from "react";
import { KeyRound, UserCheck, UserX } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { validationMessage } from "@/lib/validation/messages";
import { LIMITS } from "@/lib/validation/limits";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, TextInput } from "@/components/ui/field";
import { Notice } from "@/components/ui/surface";
import {
  resetUserPasswordAction,
  setUserActiveAction,
  type UserFormState,
} from "../actions";

/**
 * Deactivation and password reset. Deactivating is confirmed, because it blocks
 * somebody from signing in, and the wording states plainly that their history
 * is kept rather than deleted.
 */
export function UserAdminActions({
  userId,
  name,
  isActive,
  isSelf,
}: {
  userId: string;
  name: string;
  isActive: boolean;
  isSelf: boolean;
}) {
  const { dict } = useI18n();

  return (
    <div className="flex flex-wrap gap-2">
      <ResetPasswordAction userId={userId} />

      {!isSelf ? (
        <ToggleActiveAction userId={userId} name={name} isActive={isActive} />
      ) : (
        <p className="text-xs text-ink-subtle">{dict.admin.cannotDeactivateSelf}</p>
      )}
    </div>
  );
}

function ToggleActiveAction({
  userId,
  name,
  isActive,
}: {
  userId: string;
  name: string;
  isActive: boolean;
}) {
  const t = useI18n();
  const { dict } = t;
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<UserFormState | undefined, FormData>(
    async (previous, formData) => {
      const result = await setUserActiveAction(previous, formData);
      if (result.ok) setOpen(false);
      return result;
    },
    undefined,
  );

  const title = t.fmt(
    isActive ? dict.admin.deactivateConfirmTitle : dict.admin.reactivateConfirmTitle,
    { name },
  );
  const body = isActive
    ? dict.admin.deactivateConfirmBody
    : dict.admin.reactivateConfirmBody;

  const blocked =
    state && !state.ok && state.fieldErrors?.form
      ? state.fieldErrors.form in dict.admin
        ? dict.admin[state.fieldErrors.form as keyof typeof dict.admin]
        : dict.errors.saveFailed
      : undefined;

  return (
    <>
      <Button
        variant={isActive ? "danger" : "secondary"}
        onClick={() => setOpen(true)}
      >
        {isActive ? <UserX aria-hidden size={17} /> : <UserCheck aria-hidden size={17} />}
        {isActive ? dict.admin.deactivate : dict.admin.reactivate}
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
              form="toggle-active-form"
              variant={isActive ? "danger" : "primary"}
              disabled={pending}
            >
              {pending ? dict.common.saving : dict.common.confirm}
            </Button>
          </>
        }
      >
        <form id="toggle-active-form" action={formAction} className="pb-2">
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="isActive" value={isActive ? "false" : "true"} />
          {typeof blocked === "string" ? <Notice tone="danger">{blocked}</Notice> : null}
        </form>
      </Modal>
    </>
  );
}

function ResetPasswordAction({ userId }: { userId: string }) {
  const t = useI18n();
  const { dict } = t;
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<UserFormState | undefined, FormData>(
    async (previous, formData) => {
      const result = await resetUserPasswordAction(previous, formData);
      if (result.ok) setOpen(false);
      return result;
    },
    undefined,
  );

  const passwordId = useId();
  const confirmId = useId();

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const errorOf = (field: string): string | undefined =>
    fieldErrors[field] ? validationMessage(fieldErrors[field], t) : undefined;

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <KeyRound aria-hidden size={17} />
        {dict.admin.resetPassword}
      </Button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={dict.admin.resetPassword}
        size="sm"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {dict.common.cancel}
            </Button>
            <Button
              type="submit"
              form="reset-password-form"
              variant="primary"
              disabled={pending}
            >
              {pending ? dict.common.saving : dict.common.confirm}
            </Button>
          </>
        }
      >
        <form id="reset-password-form" action={formAction} className="space-y-4 pb-2">
          <input type="hidden" name="userId" value={userId} />

          <Field
            htmlFor={passwordId}
            label={dict.admin.newPassword}
            error={errorOf("password")}
            required
          >
            <TextInput
              id={passwordId}
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={LIMITS.passwordMin}
              required
              invalid={Boolean(fieldErrors.password)}
            />
          </Field>

          <Field
            htmlFor={confirmId}
            label={dict.admin.confirmNewPassword}
            error={errorOf("confirmPassword")}
            required
          >
            <TextInput
              id={confirmId}
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              invalid={Boolean(fieldErrors.confirmPassword)}
            />
          </Field>

          <p className="text-xs leading-relaxed text-ink-subtle">
            {dict.profile.signOutEverywhere}
          </p>
        </form>
      </Modal>
    </>
  );
}
