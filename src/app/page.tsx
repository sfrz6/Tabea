import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";

/** Tabea has no public landing page: a visitor goes to their work or to sign in. */
export default async function RootPage() {
  const user = await getCurrentUser();
  redirect(user ? "/dashboard" : "/login");
}
