"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";

/**
 * One dialog that behaves correctly on both targets: a bottom sheet on a phone,
 * where a thumb reaches the bottom of the screen, and a centred panel on a
 * desktop. The content area scrolls on its own and the footer keeps clear of
 * the iPhone home indicator.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  trigger,
  size = "md",
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  trigger?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const { dict } = useI18n();

  const width = size === "sm" ? "sm:max-w-sm" : size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}

      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]"
          style={{ animation: "overlay-in 150ms ease-out" }}
        />

        <Dialog.Content
          aria-describedby={description ? undefined : ""}
          className={cn(
            "fixed z-50 flex flex-col bg-surface-raised text-ink",
            // Phone: a sheet docked to the bottom edge.
            "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-2xl",
            // Desktop: a centred panel. Physical left and translate are used
            // rather than logical start, so one rule centres it in both
            // directions without an RTL override.
            "sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-h-[85dvh] sm:w-[calc(100%-3rem)]",
            "sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--radius-card)]",
            "border border-border shadow-sheet sm:shadow-raised",
            width,
          )}
          style={{ animation: "sheet-in 220ms cubic-bezier(0.32, 0.72, 0, 1)" }}
        >
          {/* Grab handle, a familiar affordance for a sheet on iOS. */}
          <div aria-hidden className="flex justify-center pt-2.5 sm:hidden">
            <span className="h-1 w-9 rounded-full bg-border-strong" />
          </div>

          <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-4 sm:pt-5">
            <div className="min-w-0">
              <Dialog.Title className="text-base font-semibold tracking-tight text-ink">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm leading-relaxed text-ink-muted">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>

            <Dialog.Close
              aria-label={dict.a11y.closeDialog}
              className={cn(
                "-me-1.5 -mt-1.5 inline-flex size-10 shrink-0 items-center justify-center",
                "rounded-full text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink",
              )}
            >
              <X aria-hidden size={18} />
            </Dialog.Close>
          </div>

          {children ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2">{children}</div>
          ) : null}

          {footer ? (
            <div
              className={cn(
                "flex flex-col-reverse gap-2 border-t border-border px-5 pb-5 pt-4",
                "pb-safe sm:flex-row sm:justify-end sm:pb-4",
              )}
            >
              {footer}
            </div>
          ) : (
            <div aria-hidden className="pb-safe" />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const ModalClose = Dialog.Close;
