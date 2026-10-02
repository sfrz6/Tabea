import type { Metadata } from "next";
import { getTranslator } from "@/lib/i18n/server";
import { getLocale } from "@/lib/i18n/server";
import { UserForm } from "@/features/users/components/user-form";
import { PageHeader } from "@/components/ui/surface";

export const metadata: Metadata = {
  title: "New user",
};

export default async function NewUserPage() {
  const t = await getTranslator();
  const locale = await getLocale();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title={t.dict.admin.newUser} />

      <UserForm
        mode="create"
        isSelf={false}
        values={{
          name: "",
          username: "",
          email: "",
          phoneNumber: "",
          role: "MEMBER",
          canViewAllTasks: false,
          canAssignTasks: false,
          canEditOthersTasks: false,
          preferredLanguage: locale,
          isActive: true,
        }}
      />
    </div>
  );
}
