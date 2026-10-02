"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/surface";
import { LanguageSwitcher } from "./language-switcher";

/**
 * The phone header. It stays out of the way: brand on one side, language and
 * profile on the other, and a back control on the screens that are reached from
 * somewhere else. The top safe area is respected so nothing hides behind the
 * Dynamic Island when Tabea runs from the home screen.
 */
export function TopBar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, dict } = useI18n();

  // Detail and form screens are entered from a list, so they get a back control.
  const isNested =
    /^\/tasks\/[^/]+/.test(pathname) ||
    /^\/admin\/[^/]+\/[^/]+/.test(pathname) ||
    pathname === "/admin/users/new";

  const BackIcon = locale === "ar" ? ChevronRight : ChevronLeft;

  return (
    <header
      className={cn(
        "sticky top-0 z-30 lg:hidden",
        "border-b border-border bg-surface/92 backdrop-blur-xl",
        "pt-safe px-safe",
      )}
    >
      <div className="flex h-14 items-center justify-between gap-2 px-3">
        <div className="flex min-w-0 items-center gap-1">
          {isNested ? (
            <button
              type="button"
              onClick={() => router.back()}
              aria-label={dict.common.back}
              className="-ms-1 inline-flex size-10 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
            >
              <BackIcon aria-hidden size={22} />
            </button>
          ) : null}
          <Link href="/dashboard" className="inline-flex rounded-md px-1">
            <Logo locale={locale} size="sm" />
          </Link>
        </div>

        <div className="flex items-center gap-0.5">
          <LanguageSwitcher variant="compact" />
          <Link
            href="/profile"
            aria-label={dict.nav.profile}
            className="inline-flex size-11 items-center justify-center rounded-full transition-colors hover:bg-surface-sunken"
          >
            <Avatar name={userName} size="sm" />
          </Link>
        </div>
      </div>
    </header>
  );
}
