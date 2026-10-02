import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { requireActor } from "@/lib/auth/current-user";
import { canManageUsers } from "@/lib/permissions";
import { AdminTabs } from "@/features/users/components/admin-tabs";

/**
 * Everything under /admin is for administrators only. The check sits here so no
 * admin page can forget it, and every admin action repeats it on the server
 * before it writes anything.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { actor } = await requireActor();

  // Reported as missing rather than forbidden, so the area does not advertise
  // its existence to somebody who has no business there.
  if (!canManageUsers(actor)) notFound();

  return (
    <div className="space-y-5">
      <AdminTabs />
      {children}
    </div>
  );
}
