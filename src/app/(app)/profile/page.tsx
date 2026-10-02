import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/current-user";
import { getTranslator } from "@/lib/i18n/server";
import { formatDate } from "@/lib/i18n/format";
import {
  Card,
  MetaList,
  MetaRow,
  Notice,
  PageHeader,
  SectionHeader,
} from "@/components/ui/surface";
import {
  ChangePasswordForm,
  ProfileDetailsForm,
  SignOutEverywhereButton,
} from "@/features/users/components/profile-forms";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const user = await requireUser();
  const t = await getTranslator();
  const { dict, locale } = t;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title={dict.profile.title} />

      <Card className="px-4">
        <SectionHeader title={dict.profile.account} className="pt-4" />
        <MetaList>
          <MetaRow label={dict.profile.username}>{user.username}</MetaRow>
          <MetaRow label={dict.profile.role}>{dict.role[user.role]}</MetaRow>
          <MetaRow label={dict.admin.visibility}>
            {user.canViewAllTasks ? dict.admin.visibilityAll : dict.admin.visibilityOwn}
          </MetaRow>
          <MetaRow label={dict.admin.canAssignTasks}>
            {user.canAssignTasks ? dict.common.yes : dict.common.no}
          </MetaRow>
          <MetaRow label={dict.admin.canEditOthersTasks}>
            {user.canEditOthersTasks ? dict.common.yes : dict.common.no}
          </MetaRow>
          {user.lastLoginAt ? (
            <MetaRow label={dict.admin.lastActive}>
              {formatDate(user.lastLoginAt, locale)}
            </MetaRow>
          ) : null}
        </MetaList>
        <div className="pb-4">
          <Notice tone="neutral">{dict.profile.permissionsReadOnly}</Notice>
        </div>
      </Card>

      <ProfileDetailsForm
        defaults={{
          name: user.name,
          email: user.email ?? "",
          phoneNumber: user.phoneNumber ?? "",
          preferredLanguage: user.preferredLanguage,
        }}
      />

      <ChangePasswordForm />

      <SignOutEverywhereButton />
    </div>
  );
}
