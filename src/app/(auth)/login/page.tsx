import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getLocale, getTranslator } from "@/lib/i18n/server";
import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage() {
  // Somebody already signed in has no reason to see this screen.
  if (await getCurrentUser()) redirect("/dashboard");

  const locale = await getLocale();
  const t = await getTranslator();

  return (
    <div className="flex min-h-dvh flex-col bg-canvas px-safe">
      <div className="flex justify-end px-4 pt-safe">
        <div className="pt-3">
          <LanguageSwitcher variant="compact" />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <Logo locale={locale} size="lg" className="justify-center" />
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              {t.dict.brand.tagline}
            </p>
          </div>

          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-card sm:p-6">
            <h1 className="text-lg font-semibold tracking-tight text-ink">
              {t.dict.auth.signInTitle}
            </h1>
            <p className="mb-5 mt-1 text-sm leading-relaxed text-ink-muted">
              {t.dict.auth.signInSubtitle}
            </p>

            <LoginForm />
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-ink-subtle">
            {t.dict.auth.privateNotice}
          </p>
        </div>
      </div>
    </div>
  );
}
