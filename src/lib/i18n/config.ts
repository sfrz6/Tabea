export const LOCALES = ["en", "ar"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie that carries the chosen language for signed out visitors and for fast reads. */
export const LOCALE_COOKIE = "tabea_locale";

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type Direction = "ltr" | "rtl";

export const DIRECTIONS: Record<Locale, Direction> = {
  en: "ltr",
  ar: "rtl",
};

/** Native language names, used in the language switcher. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};

/**
 * BCP 47 tags used for Intl formatting. Arabic is pinned to Latin digits
 * because business users in the Gulf read figures and dates that way, while
 * month names and ordering still follow Arabic conventions.
 */
export const INTL_LOCALES: Record<Locale, string> = {
  en: "en-GB",
  ar: "ar-u-nu-latn",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function directionOf(locale: Locale): Direction {
  return DIRECTIONS[locale];
}
