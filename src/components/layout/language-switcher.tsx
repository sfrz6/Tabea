"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { setLocaleAction } from "@/features/auth/actions";

/**
 * Switching language rewrites the cookie and, for a signed in person, saves the
 * choice to their account so it follows them to another device. The page is then
 * refreshed rather than re-rendered on the client, because the document
 * direction itself has to change.
 */
export function LanguageSwitcher({
  className,
  variant = "select",
}: {
  className?: string;
  variant?: "select" | "compact";
}) {
  const router = useRouter();
  const { locale, dict } = useI18n();
  const [pending, startTransition] = useTransition();

  function change(next: Locale): void {
    if (next === locale) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  if (variant === "compact") {
    const next: Locale = locale === "en" ? "ar" : "en";
    return (
      <button
        type="button"
        onClick={() => change(next)}
        disabled={pending}
        aria-label={dict.a11y.changeLanguage}
        className={cn(
          "inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-control)] px-2.5",
          "text-sm font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink",
          "disabled:opacity-50",
          className,
        )}
      >
        <Languages aria-hidden size={18} />
        <span>{LOCALE_LABELS[next]}</span>
      </button>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <label htmlFor="language-switcher" className="sr-only">
        {dict.a11y.changeLanguage}
      </label>
      <select
        id="language-switcher"
        value={locale}
        disabled={pending}
        onChange={(event) => change(event.target.value as Locale)}
        className={cn(
          "min-h-10 w-full appearance-none rounded-[var(--radius-control)] border border-border",
          "bg-surface ps-8 pe-3 text-sm text-ink transition-colors hover:bg-surface-sunken",
          "disabled:opacity-50",
        )}
      >
        {LOCALES.map((value) => (
          <option key={value} value={value}>
            {LOCALE_LABELS[value]}
          </option>
        ))}
      </select>
      <Languages
        aria-hidden
        size={16}
        className="pointer-events-none absolute inset-y-0 start-2.5 my-auto text-ink-subtle"
      />
    </div>
  );
}
