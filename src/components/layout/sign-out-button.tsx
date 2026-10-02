"use client";

import { LogOut } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { logoutAction } from "@/features/auth/actions";
import { Button, IconButton } from "@/components/ui/button";

/**
 * A real form posting to a server action, so signing out works even if the
 * client bundle has not loaded yet.
 */
export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const { dict } = useI18n();

  return (
    <form action={logoutAction}>
      {compact ? (
        <IconButton type="submit" variant="ghost" aria-label={dict.nav.signOut}>
          <LogOut aria-hidden size={18} />
        </IconButton>
      ) : (
        <Button type="submit" variant="secondary" fullWidth>
          <LogOut aria-hidden size={17} />
          {dict.nav.signOut}
        </Button>
      )}
    </form>
  );
}
