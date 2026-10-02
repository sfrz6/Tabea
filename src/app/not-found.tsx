import Link from "next/link";
import { getLocale, getTranslator } from "@/lib/i18n/server";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslator();
  const locale = await getLocale();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <Logo locale={locale} />
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold tracking-tight text-ink">
          {t.dict.errors.notFoundTitle}
        </h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          {t.dict.errors.notFoundBody}
        </p>
      </div>
      <Button asChild variant="primary">
        <Link href="/dashboard">{t.dict.errors.backToDashboard}</Link>
      </Button>
    </div>
  );
}
