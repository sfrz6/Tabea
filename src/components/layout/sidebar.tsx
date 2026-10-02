"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  History,
  LayoutGrid,
  ListChecks,
  Plus,
  Settings2,
  SquareCheckBig,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/surface";
import { NAV_ITEMS, isActive, navLabel, type NavKey } from "./nav-config";
import { LanguageSwitcher } from "./language-switcher";
import { SignOutButton } from "./sign-out-button";

const ICONS: Record<NavKey, LucideIcon> = {
  dashboard: LayoutGrid,
  myTasks: SquareCheckBig,
  tasks: ListChecks,
  activity: History,
  notifications: Bell,
  more: Settings2,
  admin: Settings2,
  profile: UserRound,
};

/**
 * Desktop navigation. The phone layout is the one that was designed first, so
 * this is a genuinely different arrangement rather than the same bar stretched
 * across a wide screen.
 */
export function Sidebar({
  keys,
  unreadCount,
  user,
  canCreateTasks,
}: {
  keys: NavKey[];
  unreadCount: number;
  user: { name: string; roleLabel: string };
  canCreateTasks: boolean;
}) {
  const pathname = usePathname();
  const { dict, locale } = useI18n();

  return (
    <aside
      className={cn(
        "hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col",
        "sticky top-0 h-dvh border-e border-border bg-surface",
      )}
    >
      <div className="px-5 pb-4 pt-6">
        <Link href="/dashboard" className="inline-flex rounded-md">
          <Logo locale={locale} />
        </Link>
      </div>

      {canCreateTasks ? (
        <div className="px-4 pb-3">
          <Button asChild variant="primary" fullWidth>
            <Link href="/tasks/new">
              <Plus aria-hidden size={17} />
              {dict.nav.newTask}
            </Link>
          </Button>
        </div>
      ) : null}

      <nav aria-label={dict.nav.mainNavigation} className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-0.5">
          {keys.map((key) => {
            const item = NAV_ITEMS[key];
            const Icon = ICONS[key];
            const active = isActive(pathname, item);
            const showBadge = key === "notifications" && unreadCount > 0;

            return (
              <li key={key}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-10 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm font-medium",
                    "transition-colors",
                    active
                      ? "bg-brand-soft text-brand"
                      : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
                  )}
                >
                  <Icon aria-hidden size={18} strokeWidth={active ? 2.25 : 1.75} />
                  <span className="flex-1 truncate">{navLabel(key, dict)}</span>
                  {showBadge ? (
                    <span className="inline-flex min-w-5 justify-center rounded-full bg-danger px-1.5 text-[0.6875rem] font-bold leading-5 text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-3 border-t border-border p-4">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{user.name}</p>
            <p className="truncate text-xs text-ink-subtle">{user.roleLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher className="flex-1" />
          <SignOutButton compact />
        </div>
      </div>
    </aside>
  );
}
