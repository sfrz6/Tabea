import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { createTranslator, type Translator } from "./translate";

/**
 * Resolves the language for the current request. A signed in user carries their
 * saved preference in the same cookie, which is rewritten at sign in, so this
 * one read serves both signed in and signed out pages without a database hit.
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Server side translator for the current request. */
export async function getTranslator(): Promise<Translator> {
  return createTranslator(await getLocale());
}
