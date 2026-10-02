import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/current-user";
import { getTranslator } from "@/lib/i18n/server";
import {
  countUnreadNotifications,
  listNotifications,
} from "@/features/notifications/queries";
import { NotificationList } from "@/features/notifications/components/notification-list";
import { PageHeader } from "@/components/ui/surface";

export const metadata: Metadata = {
  title: "Notifications",
};

export default async function NotificationsPage() {
  const user = await requireUser();
  const t = await getTranslator();

  // Notifications belong to one person, so the signed in user id is the whole
  // authorization rule for this screen.
  const [items, unreadCount] = await Promise.all([
    listNotifications(user.id),
    countUnreadNotifications(user.id),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title={t.dict.notifications.title} />
      <NotificationList items={items} unreadCount={unreadCount} />
    </div>
  );
}
