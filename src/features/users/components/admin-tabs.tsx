"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";

/**
 * The activity log is deliberately absent: it lives at /activity for everybody,
 * and an administrator sees every task anyway, so a second copy here would show
 * exactly the same rows.
 */
const TABS = [
  { href: "/admin", key: "overview" },
  { href: "/admin/users", key: "users" },
  { href: "/admin/settings", key: "settings" },
] as const;

/** A swipeable rail on a phone, a plain row on a desktop. */
export function AdminTabs() {
  const pathname = usePathname();
  const { dict } = useI18n();

  const label = (key: (typeof TABS)[number]["key"]): string => {
    switch (key) {
      case "overview":
        return dict.admin.overview;
      case "users":
        return dict.admin.users;
      case "settings":
        return dict.admin.settings;
    }
  };

  return (
    <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <nav aria-label={dict.admin.title} className="flex w-max gap-1 border-b border-border">
        {TABS.map((tab) => {
          const active =
            tab.href === "/admin"
              ? pathname === "/admin"
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative -mb-px inline-flex min-h-11 items-center whitespace-nowrap px-3.5",
                "border-b-2 text-sm font-medium transition-colors",
                active
                  ? "border-brand text-brand"
                  : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {label(tab.key)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
