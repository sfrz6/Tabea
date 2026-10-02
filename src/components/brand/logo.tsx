import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/config";

/**
 * The Tabea mark: a tracking ring that has almost closed, with a solid head at
 * the leading edge. The ring is the follow up, the head is the responsibility
 * being followed, and the gap at the top is the part still to be done.
 *
 * Drawn inline as SVG rather than loaded as an image, so it stays sharp on a
 * Retina screen, costs no extra request and can take the surrounding colour.
 */
export function LogoMark({
  size = 28,
  className,
  title,
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={cn("shrink-0 text-brand", className)}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <g fill="none" stroke="currentColor" strokeWidth="4.25" strokeLinecap="round">
        <path d="M11.07 6.73A10.5 10.5 0 1 0 20.93 6.73" />
      </g>
      <circle cx="20.93" cy="6.73" r="3.6" fill="currentColor" />
    </svg>
  );
}

/**
 * The full lockup. The brand name is never translated, only written in the
 * script of the active language, which is why both forms live here together.
 */
export function Logo({
  locale,
  size = "md",
  className,
}: {
  locale: Locale;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const markSize = size === "sm" ? 22 : size === "lg" ? 40 : 28;
  const textSize =
    size === "sm" ? "text-base" : size === "lg" ? "text-[1.75rem]" : "text-xl";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={markSize} />
      <span
        className={cn(
          "font-semibold tracking-[-0.015em] text-ink",
          // Arabic letterforms need no negative tracking and sit better slightly larger.
          locale === "ar" && "tracking-normal",
          textSize,
        )}
      >
        {locale === "ar" ? "تابع" : "Tabea"}
      </span>
    </span>
  );
}
