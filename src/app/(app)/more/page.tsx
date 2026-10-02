import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  History,
  ListChecks,
  Settings2,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { requireActor } from "@/lib/auth/current-user";
import { getTranslator } from "@/lib/i18n/server";
import { canViewAllTasks, isAdmin } from "@/lib/permissions";
import { Avatar, Card, PageHeader } from "@/components/ui/surface";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { SignOutButton } from "@/components/layout/sign-out-button";

export const metadata: Metadata = {
  title: "More",
};

type Entry = { href: string; label: string; icon: LucideIcon; description?: string };

/**
 * The overflow screen for a phone. It holds what does not deserve a place in
 * the bottom bar: the profile, the admin area and the language choice.
 */
export default async function MorePage() {
  const { user, actor } = await requireActor();
  const t = await getTranslator();
  const { dict } = t;

  const Arrow = t.locale === "ar" ? ChevronLeft : ChevronRight;

  const entries: Entry[] = [
    { href: "/activity", label: dict.activity.title, icon: History },
    { href: "/profile", label: dict.nav.profile, icon: UserRound },
  ];

  if (canViewAllTasks(actor)) {
    entries.unshift({ href: "/tasks", label: dict.nav.allTasks, icon: ListChecks });
  }

  if (isAdmin(actor)) {
    entries.push(
      { href: "/admin", label: dict.admin.overview, icon: ShieldCheck },
      { href: "/admin/users", label: dict.admin.users, icon: UserRound },
      { href: "/admin/settings", label: dict.admin.settings, icon: Settings2 },
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title={dict.nav.more} />

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{user.name}</p>
            <p className="truncate text-xs text-ink-subtle">
              {user.username} · {dict.role[user.role]}
            </p>
          </div>
        </div>
      </Card>

      <nav>
        <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-card">
          {entries.map((entry) => (
            <li key={entry.href}>
              <Link
                href={entry.href}
                className="flex min-h-14 items-center gap-3 px-4 transition-colors hover:bg-surface-sunken"
              >
                <entry.icon aria-hidden size={19} className="shrink-0 text-ink-subtle" />
                <span className="flex-1 text-sm font-medium text-ink">{entry.label}</span>
                <Arrow aria-hidden size={18} className="shrink-0 text-ink-subtle" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-3">
        <p className="px-0.5 text-xs font-medium text-ink-subtle">{dict.common.language}</p>
        <LanguageSwitcher />
      </div>

      <SignOutButton />

      <p className="pt-2 text-center text-xs text-ink-subtle">
        {dict.brand.name} · {dict.brand.tagline}
      </p>
    </div>
  );
}
