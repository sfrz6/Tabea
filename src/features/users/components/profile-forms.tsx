"use client";

import { useActionState, useId } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { validationMessage } from "@/lib/validation/messages";
import { LIMITS } from "@/lib/validation/limits";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { Button } from "@/components/ui/button";
import { Field, Select, TextInput } from "@/components/ui/field";
import { Card, Notice, SectionHeader } from "@/components/ui/surface";
import {
  changePasswordAction,
  signOutOtherDevicesAction,
  updateProfileAction,
  type UserFormState,
} from "../actions";

/**
 * Personal details and language. Role, visibility and task rights are not in
 * this form and are not read by the action behind it, so they can only be
 * changed by an administrator.
 */
export function ProfileDetailsForm({
  defaults,
}: {
  defaults: {
    name: string;
    email: string;
    phoneNumber: string;
    preferredLanguage: string;
  };
}) {
  const t = useI18n();
  const { dict } = t;
  const router = useRouter();

  const [state, formAction, pending] = useActionState<UserFormState | undefined, FormData>(
    async (previous, formData) => {
      const result = await updateProfileAction(previous, formData);
      // The document direction changes with the language, so the page is
      // refreshed from the server rather than patched on the client.
      if (result.ok) router.refresh();
      return result;
    },
    undefined,
  );

  const nameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const languageId = useId();

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const errorOf = (field: string): string | undefined =>
    fieldErrors[field] ? validationMessage(fieldErrors[field], t) : undefined;

  return (
    <Card className="p-4 sm:p-5">
      <SectionHeader title={dict.profile.yourDetails} className="mb-4" />

      <form action={formAction} className="space-y-4" noValidate>
        {state?.ok ? <Notice tone="success">{dict.profile.detailsUpdated}</Notice> : null}

        <Field htmlFor={nameId} label={dict.profile.name} error={errorOf("name")} required>
          <TextInput
            id={nameId}
            name="name"
            defaultValue={defaults.name}
            maxLength={LIMITS.nameMax}
            autoComplete="name"
            required
            invalid={Boolean(fieldErrors.name)}
          />
        </Field>

        <Field htmlFor={emailId} label={dict.profile.email} error={errorOf("email")}>
          <TextInput
            id={emailId}
            name="email"
            type="email"
            inputMode="email"
            defaultValue={defaults.email}
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            invalid={Boolean(fieldErrors.email)}
          />
        </Field>

        <Field
          htmlFor={phoneId}
          label={dict.profile.phoneNumber}
          hint={dict.profile.phoneHint}
          error={errorOf("phoneNumber")}
        >
          <TextInput
            id={phoneId}
            name="phoneNumber"
            type="tel"
            inputMode="tel"
            defaultValue={defaults.phoneNumber}
            autoComplete="tel"
            placeholder="+968 9123 4567"
            hasHint
            invalid={Boolean(fieldErrors.phoneNumber)}
          />
        </Field>

        <Field
          htmlFor={languageId}
          label={dict.profile.languagePreference}
          hint={dict.profile.languageHint}
        >
          <Select
            id={languageId}
            name="preferredLanguage"
            defaultValue={defaults.preferredLanguage}
            hasHint
          >
            {LOCALES.map((locale) => (
              <option key={locale} value={locale}>
                {LOCALE_LABELS[locale]}
              </option>
            ))}
          </Select>
        </Field>

        <Button type="submit" variant="primary" disabled={pending} fullWidth>
          {pending ? dict.common.saving : dict.common.save}
        </Button>
      </form>
    </Card>
  );
}

export function ChangePasswordForm() {
  const t = useI18n();
  const { dict } = t;

  const [state, formAction, pending] = useActionState<UserFormState | undefined, FormData>(
    changePasswordAction,
    undefined,
  );

  const currentId = useId();
  const newId = useId();
  const confirmId = useId();

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const errorOf = (field: string): string | undefined =>
    fieldErrors[field] ? validationMessage(fieldErrors[field], t) : undefined;

  return (
    <Card className="p-4 sm:p-5">
      <SectionHeader title={dict.profile.changePassword} className="mb-4" />

      <form action={formAction} className="space-y-4" noValidate>
        {state?.ok ? <Notice tone="success">{dict.profile.passwordChanged}</Notice> : null}

        <Field
          htmlFor={currentId}
          label={dict.profile.currentPassword}
          error={errorOf("currentPassword")}
          required
        >
          <TextInput
            id={currentId}
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            invalid={Boolean(fieldErrors.currentPassword)}
          />
        </Field>

        <Field
          htmlFor={newId}
          label={dict.profile.newPassword}
          error={errorOf("newPassword")}
          required
        >
          <TextInput
            id={newId}
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={LIMITS.passwordMin}
            required
            invalid={Boolean(fieldErrors.newPassword)}
          />
        </Field>

        <Field
          htmlFor={confirmId}
          label={dict.profile.confirmPassword}
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

        <Button type="submit" variant="primary" disabled={pending} fullWidth>
          {pending ? dict.common.saving : dict.profile.changePassword}
        </Button>
      </form>
    </Card>
  );
}

export function SignOutEverywhereButton() {
  const { dict } = useI18n();
  const [state, formAction, pending] = useActionState<UserFormState | undefined, FormData>(
    () => signOutOtherDevicesAction(),
    undefined,
  );

  return (
    <form action={formAction} className="space-y-2">
      {state?.ok ? <Notice tone="success">{dict.profile.signedOutEverywhere}</Notice> : null}
      <Button type="submit" variant="secondary" disabled={pending} fullWidth>
        {dict.profile.signOutEverywhere}
      </Button>
    </form>
  );
}
