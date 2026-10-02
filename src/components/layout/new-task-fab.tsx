"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";

/**
 * Creating work is the action a manager takes most often, so on a phone it gets
 * a permanent thumb reachable control rather than a button buried in a menu. It
 * floats above the bottom navigation and clears the home indicator.
 *
 * It hides itself on the screens where it would be noise, including the task
 * form it leads to.
 */
export function NewTaskFab() {
  const pathname = usePathname();
  const { dict } = useI18n();

  const hidden =
    // The task screen has its own actions at the bottom, which the button
    // would sit on top of, and creating work is not what somebody came there
    // to do.
    /^\/tasks\/[^/]+/.test(pathname) ||
    pathname.includes("/edit") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/more");

  if (hidden) return null;

  return (
    <Link
      href="/tasks/new"
      aria-label={dict.nav.newTask}
      className={cn(
        "fixed end-4 z-40 lg:hidden bottom-nav",
        "inline-flex size-14 items-center justify-center rounded-full",
        "bg-brand text-on-brand shadow-raised",
        "transition-transform active:scale-95",
      )}
    >
      <Plus aria-hidden size={24} strokeWidth={2.25} />
    </Link>
  );
}
