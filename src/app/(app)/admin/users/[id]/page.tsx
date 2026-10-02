import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { getTranslator } from "@/lib/i18n/server";
import { isAppError } from "@/lib/errors";
import { formatDate } from "@/lib/i18n/format";
import { getUserForAdmin } from "@/features/users/queries";
import { UserForm } from "@/features/users/components/user-form";
import { UserAdminActions } from "@/features/users/components/user-admin-actions";
import { Card, MetaList, MetaRow, PageHeader } from "@/components/ui/surface";

export const metadata: Metadata = {
  title: "Edit user",
};

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const current = await requireUser();
  const t = await getTranslator();
  const { dict, locale } = t;

  let user;
  try {
    user = await getUserForAdmin(id);
  } catch (error) {
    if (isAppError(error) && error.code === "USER_NOT_FOUND") notFound();
    throw error;
  }

  const isSelf = user.id === current.id;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title={dict.admin.editUser} description={user.name} />

      <Card className="px-4">
        <MetaList>
          <MetaRow label={dict.admin.lastActive}>
            {user.lastLoginAt ? formatDate(user.lastLoginAt, locale) : dict.admin.neverSignedIn}
          </MetaRow>
          <MetaRow label={dict.admin.openTasksCount}>{user.openTasks}</MetaRow>
          <MetaRow label={dict.admin.overdueCount}>{user.overdueTasks}</MetaRow>
          <MetaRow label={dict.tasks.fields.createdAt}>
            {formatDate(user.createdAt, locale)}
          </MetaRow>
        </MetaList>
      </Card>

      <UserAdminActions
        userId={user.id}
        name={user.name}
        isActive={user.isActive}
        isSelf={isSelf}
      />

      <UserForm
        mode="edit"
        isSelf={isSelf}
        values={{
          userId: user.id,
          name: user.name,
          username: user.username,
          email: user.email ?? "",
          phoneNumber: user.phoneNumber ?? "",
          role: user.role,
          canViewAllTasks: user.canViewAllTasks,
          canAssignTasks: user.canAssignTasks,
          canEditOthersTasks: user.canEditOthersTasks,
          preferredLanguage: user.preferredLanguage,
          isActive: user.isActive,
        }}
      />
    </div>
  );
}
