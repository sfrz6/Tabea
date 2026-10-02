import type { Dictionary } from "@/lib/i18n/types";

/** Navigation entries the shell can show. The set is deliberately small. */
export type NavKey =
  | "dashboard"
  | "myTasks"
  | "tasks"
  | "activity"
  | "notifications"
  | "more"
  | "admin"
  | "profile";

export type NavItem = {
  key: NavKey;
  href: string;
  /** Matches the route and everything under it, for the active state. */
  match: string;
};

export const NAV_ITEMS: Record<NavKey, NavItem> = {
  dashboard: { key: "dashboard", href: "/dashboard", match: "/dashboard" },
  myTasks: { key: "myTasks", href: "/my-tasks", match: "/my-tasks" },
  tasks: { key: "tasks", href: "/tasks", match: "/tasks" },
  activity: { key: "activity", href: "/activity", match: "/activity" },
  notifications: {
    key: "notifications",
    href: "/notifications",
    match: "/notifications",
  },
  more: { key: "more", href: "/more", match: "/more" },
  admin: { key: "admin", href: "/admin", match: "/admin" },
  profile: { key: "profile", href: "/profile", match: "/profile" },
};

export function navLabel(key: NavKey, dict: Dictionary): string {
  switch (key) {
    case "dashboard":
      return dict.nav.dashboard;
    case "myTasks":
      return dict.nav.myTasks;
    case "tasks":
      return dict.nav.allTasks;
    case "activity":
      return dict.activity.title;
    case "notifications":
      return dict.nav.notifications;
    case "more":
      return dict.nav.more;
    case "admin":
      return dict.nav.admin;
    case "profile":
      return dict.nav.profile;
  }
}

/**
 * Which entries a person sees. All Tasks only appears for somebody who may
 * actually read every task, and the admin area only for an administrator. The
 * same conditions are enforced again on the server for each route, so hiding a
 * link is presentation and never the protection itself.
 */
export function navKeysFor(options: {
  canViewAllTasks: boolean;
  isAdmin: boolean;
}): { bottom: NavKey[]; sidebar: NavKey[] } {
  const bottom: NavKey[] = ["dashboard", "myTasks"];
  if (options.canViewAllTasks) bottom.push("tasks");
  bottom.push("notifications", "more");

  // The phone bar stays at five entries, so the history lives under More there
  // and gets its own place in the wider sidebar.
  const sidebar: NavKey[] = ["dashboard", "myTasks"];
  if (options.canViewAllTasks) sidebar.push("tasks");
  sidebar.push("activity", "notifications");
  if (options.isAdmin) sidebar.push("admin");
  sidebar.push("profile");

  return { bottom, sidebar };
}

/** True when the current path belongs to the entry. */
export function isActive(pathname: string, item: NavItem): boolean {
  if (item.match === "/tasks") {
    // The task detail route lives under /tasks, but a member reaching it from
    // My Tasks should not see All Tasks light up instead.
    return pathname === "/tasks" || pathname.startsWith("/tasks?");
  }
  return pathname === item.match || pathname.startsWith(`${item.match}/`);
}
