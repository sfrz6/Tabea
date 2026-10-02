import { cn } from "@/lib/utils";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

/* -------------------------------------------------------------------------- */
/*                                   Field                                    */
/* -------------------------------------------------------------------------- */

export type FieldProps = {
  /** Must match the id of the control, so tapping the label focuses it. */
  htmlFor: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  requiredLabel?: string;
  children: ReactNode;
  className?: string;
};

/**
 * One wrapper for label, hint and error. Errors are announced politely and tied
 * to the control with aria-describedby by the input components below, so a
 * screen reader user hears the problem rather than only seeing a red outline.
 */
export function Field({
  htmlFor,
  label,
  hint,
  error,
  required,
  requiredLabel,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1.5 text-sm font-medium text-ink"
      >
        <span>{label}</span>
        {required && requiredLabel ? (
          <span className="text-xs font-normal text-ink-subtle">({requiredLabel})</span>
        ) : null}
      </label>

      {children}

      {hint && !error ? (
        <p id={`${htmlFor}-hint`} className="text-xs leading-relaxed text-ink-subtle">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-xs leading-relaxed text-danger"
        >
          {/* A dot carries the error alongside colour, so colour is not the only signal. */}
          <span aria-hidden className="mt-1 size-1.5 shrink-0 rounded-full bg-danger" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            Control base styling                            */
/* -------------------------------------------------------------------------- */

const controlBase = cn(
  "block w-full rounded-[var(--radius-control)] border bg-surface px-3",
  "text-ink placeholder:text-ink-subtle",
  "transition-colors duration-150",
  "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-subtle",
);

function describedBy(id: string, hint?: string, error?: string): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

/* -------------------------------------------------------------------------- */
/*                                   Input                                    */
/* -------------------------------------------------------------------------- */

export type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  invalid?: boolean;
  hasHint?: boolean;
};

export function TextInput({
  id,
  invalid,
  hasHint,
  className,
  ...props
}: TextInputProps) {
  return (
    <input
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy(id, hasHint ? "hint" : undefined, invalid ? "error" : undefined)}
      className={cn(
        controlBase,
        "min-h-11",
        invalid ? "border-danger" : "border-border-strong",
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Textarea                                  */
/* -------------------------------------------------------------------------- */

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  id: string;
  invalid?: boolean;
  hasHint?: boolean;
};

export function TextArea({ id, invalid, hasHint, className, ...props }: TextAreaProps) {
  return (
    <textarea
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy(id, hasHint ? "hint" : undefined, invalid ? "error" : undefined)}
      className={cn(
        controlBase,
        "min-h-24 py-2.5 leading-relaxed resize-y",
        invalid ? "border-danger" : "border-border-strong",
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Select                                   */
/* -------------------------------------------------------------------------- */

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  id: string;
  invalid?: boolean;
  hasHint?: boolean;
};

/**
 * A native select on purpose. On an iPhone it opens the system picker, which is
 * faster and more familiar than any custom list, handles long Arabic options
 * correctly and needs no JavaScript.
 */
export function Select({ id, invalid, hasHint, className, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy(
          id,
          hasHint ? "hint" : undefined,
          invalid ? "error" : undefined,
        )}
        className={cn(
          controlBase,
          "min-h-11 appearance-none pe-10",
          invalid ? "border-danger" : "border-border-strong",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-ink-subtle"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 4.5 6 8l3.5-3.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Checkbox                                  */
/* -------------------------------------------------------------------------- */

export type CheckboxFieldProps = {
  id: string;
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
  disabled?: boolean;
};

/** A full width tappable row, which is far easier to hit than a bare checkbox. */
export function CheckboxField({
  id,
  name,
  label,
  hint,
  defaultChecked,
  disabled,
}: CheckboxFieldProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-[var(--radius-control)] border border-border bg-surface p-3",
        disabled && "opacity-60",
      )}
    >
      <input
        id={id}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        disabled={disabled}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-0.5 size-5 shrink-0 accent-brand"
      />
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block text-sm font-medium text-ink">
          {label}
        </label>
        {hint ? (
          <p id={`${id}-hint`} className="mt-1 text-xs leading-relaxed text-ink-subtle">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
