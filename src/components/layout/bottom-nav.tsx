"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  History,
  LayoutGrid,
  ListChecks,
  MoreHorizontal,
  SquareCheckBig,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";
import { NAV_ITEMS, isActive, navLabel, type NavKey } from "./nav-config";

const ICONS: Record<NavKey, LucideIcon> = {
  dashboard: LayoutGrid,
  myTasks: SquareCheckBig,
  tasks: ListChecks,
  activity: History,
  notifications: Bell,
  more: MoreHorizontal,
  admin: ListChecks,
  profile: MoreHorizontal,
};

/**
 * The primary navigation on a phone. It sits inside the safe area so nothing
 * lands under the home indicator, every target is a full column at least 56px
 * tall, and it carries at most five entries so none of them become cramped.
 */
export function BottomNav({
  keys,
  unreadCount,
}: {
  keys: NavKey[];
  unreadCount: number;
}) {
  const pathname = usePathname();
  const { dict, fmt } = useI18n();

  return (
    <nav
      aria-label={dict.nav.mainNavigation}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 lg:hidden",
        "border-t border-border bg-surface/92 backdrop-blur-xl",
        "pb-safe px-safe",
      )}
    >
      <ul
        className="mx-auto grid max-w-lg"
        style={{ gridTemplateColumns: `repeat(${keys.length}, minmax(0, 1fr))` }}
      >
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
                  "relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2",
                  "text-[0.6875rem] font-medium transition-colors",
                  active ? "text-brand" : "text-ink-subtle",
                )}
              >
                <span className="relative">
                  <Icon
                    aria-hidden
                    size={21}
                    strokeWidth={active ? 2.25 : 1.75}
                  />
                  {showBadge ? (
                    <span
                      className={cn(
                        "absolute -top-1 start-full -ms-2 flex min-w-4 items-center justify-center",
                        "rounded-full bg-danger px-1 text-[0.625rem] font-bold leading-4 text-white",
                      )}
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                      <span className="sr-only">
                        {fmt(dict.a11y.unreadBadge, { count: unreadCount })}
                      </span>
                    </span>
                  ) : null}
                </span>
                <span className="max-w-full truncate">{navLabel(key, dict)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
