import { Slot } from "./slot";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * Sizes are set by minimum height rather than padding alone, so every control
 * clears the 44px touch target Safari users need, including the small variant.
 */
const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm gap-1.5",
  md: "min-h-11 px-4 text-[0.9375rem] gap-2",
  lg: "min-h-12 px-5 text-base gap-2",
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-on-brand border border-transparent hover:bg-brand-strong active:bg-brand-strong",
  secondary:
    "bg-surface text-ink border border-border-strong hover:bg-surface-sunken active:bg-surface-sunken",
  ghost:
    "bg-transparent text-ink-muted border border-transparent hover:bg-surface-sunken hover:text-ink",
  subtle: "bg-brand-soft text-brand border border-transparent hover:bg-brand-soft/70",
  danger:
    "bg-surface text-danger border border-border-strong hover:bg-danger-soft hover:border-danger/40",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders the styling onto the single child element instead of a button. */
  asChild?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
};

export function Button({
  variant = "secondary",
  size = "md",
  asChild = false,
  fullWidth = false,
  className,
  type,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      // A button inside a form defaults to submit, which has caused many
      // accidental submissions. Being explicit avoids that class of bug.
      {...(asChild ? {} : { type: type ?? "button" })}
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius-control)] font-medium",
        "transition-colors duration-150 select-none",
        "disabled:pointer-events-none disabled:opacity-50",
        SIZES[size],
        VARIANTS[variant],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    />
  );
}

/** Square icon only button, sized for a thumb. */
export function IconButton({
  variant = "ghost",
  size = "md",
  className,
  type,
  ...props
}: ButtonProps) {
  const dimension = size === "sm" ? "size-9" : size === "lg" ? "size-12" : "size-11";

  return (
    <button
      type={type ?? "button"}
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius-control)]",
        "transition-colors duration-150 select-none shrink-0",
        "disabled:pointer-events-none disabled:opacity-50",
        dimension,
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
