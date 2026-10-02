"use client";

import { useActionState, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { validationMessage } from "@/lib/validation/messages";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { loginAction, type LoginState } from "../actions";

/**
 * Sign in. Field errors come back as dictionary keys and are translated here,
 * so the same server response reads correctly in Arabic or English. Every
 * failure reports the same wording, which keeps the form from revealing which
 * usernames exist.
 */
export function LoginForm() {
  const t = useI18n();
  const { dict } = t;
  const [state, formAction, pending] = useActionState<LoginState | undefined, FormData>(
    loginAction,
    undefined,
  );
  const [revealed, setRevealed] = useState(false);

  const usernameId = useId();
  const passwordId = useId();

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  const formError =
    state && !state.ok
      ? state.code === "RATE_LIMITED"
        ? t.fmt(dict.auth.tooManyAttempts, { minutes: state.message ?? "15" })
        : fieldErrors.form
          ? validationMessage(fieldErrors.form, t)
          : undefined
      : undefined;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {formError ? (
        <div
          role="alert"
          className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2.5 text-sm text-danger"
        >
          {formError}
        </div>
      ) : null}

      <Field
        htmlFor={usernameId}
        label={dict.auth.username}
        error={
          fieldErrors.username
            ? validationMessage(fieldErrors.username, t)
            : undefined
        }
      >
        <TextInput
          id={usernameId}
          name="username"
          type="text"
          inputMode="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          placeholder={dict.auth.usernamePlaceholder}
          invalid={Boolean(fieldErrors.username)}
        />
      </Field>

      <Field
        htmlFor={passwordId}
        label={dict.auth.password}
        error={
          fieldErrors.password
            ? validationMessage(fieldErrors.password, t)
            : undefined
        }
      >
        <div className="relative">
          <TextInput
            id={passwordId}
            name="password"
            type={revealed ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder={dict.auth.passwordPlaceholder}
            invalid={Boolean(fieldErrors.password)}
            className="pe-12"
          />
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? dict.auth.hidePassword : dict.auth.showPassword}
            className="absolute inset-y-0 end-0 inline-flex w-12 items-center justify-center rounded-e-[var(--radius-control)] text-ink-subtle transition-colors hover:text-ink"
          >
            {revealed ? <EyeOff aria-hidden size={18} /> : <Eye aria-hidden size={18} />}
          </button>
        </div>
      </Field>

      <Button type="submit" variant="primary" size="lg" fullWidth disabled={pending}>
        {pending ? dict.auth.signingIn : dict.auth.signIn}
      </Button>
    </form>
  );
}
