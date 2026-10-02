import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTranslator } from "@/lib/i18n/server";
import { formatDate, formatNumber } from "@/lib/i18n/format";
import { listUsersForAdmin } from "@/features/users/queries";
import { Button } from "@/components/ui/button";
import { Avatar, Card, EmptyState, PageHeader } from "@/components/ui/surface";

export const metadata: Metadata = {
  title: "Users",
};

export default async function AdminUsersPage() {
  const t = await getTranslator();
  const { dict, locale } = t;
  const users = await listUsersForAdmin();

  const Arrow = locale === "ar" ? ChevronLeft : ChevronRight;

  return (
    <div className="space-y-5">
      <PageHeader
        title={dict.admin.users}
        description={dict.admin.adminNotice}
        action={
          <Button asChild variant="primary">
            <Link href="/admin/users/new">
              <Plus aria-hidden size={17} />
              <span className="hidden sm:inline">{dict.admin.newUser}</span>
            </Link>
          </Button>
        }
      />

      {users.length === 0 ? (
        <EmptyState title={dict.admin.noUsers} />
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {users.map((user) => (
              <li key={user.id}>
                <Link
                  href={`/admin/users/${user.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-sunken"
                >
                  <Avatar name={user.name} />

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2">
                      <span
                        className={cn(
                          "truncate text-sm font-medium",
                          user.isActive ? "text-ink" : "text-ink-subtle",
                        )}
                      >
                        {user.name}
                      </span>
                      {!user.isActive ? (
                        <span className="shrink-0 rounded-full bg-neutral-soft px-2 py-0.5 text-[0.6875rem] font-medium text-ink-subtle">
                          {dict.admin.inactive}
                        </span>
                      ) : null}
                    </p>

                    <p className="mt-0.5 truncate text-xs text-ink-subtle">
                      {user.username} · {dict.role[user.role]} ·{" "}
                      {user.canViewAllTasks
                        ? dict.admin.visibilityAll
                        : dict.admin.visibilityOwn}
                    </p>

                    <p className="mt-1 text-xs text-ink-muted">
                      <span className="tabular">{formatNumber(user.openTasks, locale)}</span>{" "}
                      {dict.admin.openTasksCount}
                      {user.overdueTasks > 0 ? (
                        <span className="text-danger">
                          {" · "}
                          <span className="tabular">
                            {formatNumber(user.overdueTasks, locale)}
                          </span>{" "}
                          {dict.admin.overdueCount}
                        </span>
                      ) : null}
                    </p>
                  </div>

                  <div className="hidden shrink-0 text-end sm:block">
                    <p className="text-[0.6875rem] text-ink-subtle">{dict.admin.lastActive}</p>
                    <p className="text-xs text-ink-muted">
                      {user.lastLoginAt
                        ? formatDate(user.lastLoginAt, locale)
                        : dict.admin.neverSignedIn}
                    </p>
                  </div>

                  <Arrow aria-hidden size={18} className="shrink-0 text-ink-subtle" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
