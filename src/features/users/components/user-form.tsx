"use client";

import { useActionState, useId, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { validationMessage } from "@/lib/validation/messages";
import { LIMITS } from "@/lib/validation/limits";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { Button } from "@/components/ui/button";
import { CheckboxField, Field, Select, TextInput } from "@/components/ui/field";
import { Notice, SectionHeader } from "@/components/ui/surface";
import type { UserRole } from "@/db/schema";
import { createUserAction, editUserAction, type UserFormState } from "../actions";

const ROLES: UserRole[] = ["ADMIN", "MANAGER", "MEMBER"];

export type UserFormValues = {
  userId?: string;
  name: string;
  username: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
  canViewAllTasks: boolean;
  canAssignTasks: boolean;
  canEditOthersTasks: boolean;
  preferredLanguage: string;
  isActive: boolean;
};

/**
 * The account form. Note what is deliberately absent: there is no switch for
 * managing users. That right belongs to the ADMIN role alone and is not
 * configurable anywhere in Tabea.
 *
 * Choosing ADMIN disables the three permission switches, because an
 * administrator always holds full visibility and full task rights, and showing
 * them as editable would be a lie.
 */
export function UserForm({
  mode,
  values,
  isSelf,
}: {
  mode: "create" | "edit";
  values: UserFormValues;
  isSelf: boolean;
}) {
  const t = useI18n();
  const { dict } = t;
  const [role, setRole] = useState<UserRole>(values.role);

  const [state, formAction, pending] = useActionState<UserFormState | undefined, FormData>(
    mode === "create" ? createUserAction : editUserAction,
    undefined,
  );

  const nameId = useId();
  const usernameId = useId();
  const passwordId = useId();
  const emailId = useId();
  const phoneId = useId();
  const roleId = useId();
  const languageId = useId();

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const errorOf = (field: string): string | undefined =>
    fieldErrors[field] ? validationMessage(fieldErrors[field], t) : undefined;

  const formMessage = fieldErrors.form
    ? fieldErrors.form in dict.admin
      ? dict.admin[fieldErrors.form as keyof typeof dict.admin]
      : dict.errors.saveFailed
    : state && !state.ok && Object.keys(fieldErrors).length === 0
      ? dict.errors.saveFailed
      : undefined;

  const isAdminRole = role === "ADMIN";

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {values.userId ? <input type="hidden" name="userId" value={values.userId} /> : null}

      {typeof formMessage === "string" ? (
        <Notice tone="danger">{formMessage}</Notice>
      ) : null}

      <section className="space-y-4">
        <SectionHeader title={dict.profile.yourDetails} />

        <Field htmlFor={nameId} label={dict.profile.name} error={errorOf("name")} required>
          <TextInput
            id={nameId}
            name="name"
            defaultValue={values.name}
            maxLength={LIMITS.nameMax}
            autoComplete="off"
            required
            invalid={Boolean(fieldErrors.name)}
          />
        </Field>

        <Field
          htmlFor={usernameId}
          label={dict.profile.username}
          error={errorOf("username")}
          required
        >
          <TextInput
            id={usernameId}
            name="username"
            defaultValue={values.username}
            minLength={LIMITS.usernameMin}
            maxLength={LIMITS.usernameMax}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            required
            invalid={Boolean(fieldErrors.username)}
          />
        </Field>

        {mode === "create" ? (
          <Field
            htmlFor={passwordId}
            label={dict.auth.password}
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
        ) : null}

        <Field htmlFor={emailId} label={dict.profile.email} error={errorOf("email")}>
          <TextInput
            id={emailId}
            name="email"
            type="email"
            inputMode="email"
            defaultValue={values.email}
            autoCapitalize="none"
            spellCheck={false}
            autoComplete="off"
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
            defaultValue={values.phoneNumber}
            placeholder="+968 9123 4567"
            autoComplete="off"
            hasHint
            invalid={Boolean(fieldErrors.phoneNumber)}
          />
        </Field>

        <Field htmlFor={languageId} label={dict.profile.languagePreference}>
          <Select
            id={languageId}
            name="preferredLanguage"
            defaultValue={values.preferredLanguage}
          >
            {LOCALES.map((locale) => (
              <option key={locale} value={locale}>
                {LOCALE_LABELS[locale]}
              </option>
            ))}
          </Select>
        </Field>
      </section>

      <section className="space-y-4">
        <SectionHeader title={dict.admin.permissions} description={dict.admin.adminNotice} />

        <Field htmlFor={roleId} label={dict.profile.role} error={errorOf("role")}>
          <Select
            id={roleId}
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
            disabled={isSelf}
            invalid={Boolean(fieldErrors.role)}
          >
            {ROLES.map((value) => (
              <option key={value} value={value}>
                {dict.role[value]}
              </option>
            ))}
          </Select>
        </Field>
        {isSelf ? (
          <>
            {/* The select is disabled, so the value is submitted explicitly. */}
            <input type="hidden" name="role" value={values.role} />
            <Notice tone="neutral">{dict.admin.cannotChangeOwnRole}</Notice>
          </>
        ) : null}

        <p className="text-xs leading-relaxed text-ink-subtle">
          {dict.roleDescription[role]}
        </p>

        {isAdminRole ? (
          <Notice tone="info">{dict.admin.adminPermissionsNotice}</Notice>
        ) : null}

        {/* Keyed on the role so that switching to Admin re-renders the
            switches with their forced values rather than leaving stale ones. */}
        <div key={role} className="space-y-2">
          <CheckboxField
            id="canViewAllTasks"
            name="canViewAllTasks"
            label={dict.admin.canViewAllTasks}
            hint={dict.admin.canViewAllTasksHint}
            defaultChecked={values.canViewAllTasks || isAdminRole}
            disabled={isAdminRole}
          />
          <CheckboxField
            id="canAssignTasks"
            name="canAssignTasks"
            label={dict.admin.canAssignTasks}
            hint={dict.admin.canAssignTasksHint}
            defaultChecked={values.canAssignTasks || isAdminRole}
            disabled={isAdminRole}
          />
          <CheckboxField
            id="canEditOthersTasks"
            name="canEditOthersTasks"
            label={dict.admin.canEditOthersTasks}
            hint={dict.admin.canEditOthersTasksHint}
            defaultChecked={values.canEditOthersTasks || isAdminRole}
            disabled={isAdminRole}
          />
        </div>

        <CheckboxField
          id="isActive"
          name="isActive"
          label={dict.admin.active}
          defaultChecked={values.isActive}
          disabled={isSelf}
        />
        {isSelf ? <input type="hidden" name="isActive" value="true" /> : null}
      </section>

      <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-start">
        <Button type="submit" variant="primary" size="lg" disabled={pending} fullWidth>
          {pending
            ? dict.common.saving
            : mode === "create"
              ? dict.admin.createUser
              : dict.common.save}
        </Button>
        <Button asChild variant="ghost" size="lg" fullWidth>
          <Link href="/admin/users">{dict.common.cancel}</Link>
        </Button>
      </div>
    </form>
  );
}
