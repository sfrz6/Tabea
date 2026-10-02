import type { ReactNode } from "react";
import { requireActor } from "@/lib/auth/current-user";
import { getTranslator } from "@/lib/i18n/server";
import { canCreateTasks, canViewAllTasks, isAdmin } from "@/lib/permissions";
import { countUnreadNotifications } from "@/features/notifications/queries";
import { navKeysFor } from "@/components/layout/nav-config";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { NewTaskFab } from "@/components/layout/new-task-fab";

/**
 * The signed in shell. Authentication is checked here, once, for every page
 * underneath, and the navigation is built from the same permission helpers the
 * server actions use, so what a person can see and what they can reach stay in
 * step.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user, actor } = await requireActor();
  const t = await getTranslator();

  const unreadCount = await countUnreadNotifications(user.id);
  const keys = navKeysFor({
    canViewAllTasks: canViewAllTasks(actor),
    isAdmin: isAdmin(actor),
  });

  return (
    <div className="flex min-h-dvh bg-canvas">
      <Sidebar
        keys={keys.sidebar}
        unreadCount={unreadCount}
        user={{ name: user.name, roleLabel: t.dict.role[user.role] }}
        canCreateTasks={canCreateTasks(actor)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar userName={user.name} />

        <main
          id="main"
          className="mx-auto w-full max-w-5xl flex-1 px-4 pb-nav pt-4 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8"
        >
          {children}
        </main>
      </div>

      <BottomNav keys={keys.bottom} unreadCount={unreadCount} />
      {canCreateTasks(actor) ? <NewTaskFab /> : null}
    </div>
  );
}
