"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "./config";
import { createTranslator, type Translator } from "./translate";

const I18nContext = createContext<Translator | null>(null);

/**
 * Only the active locale crosses the server boundary. The dictionary itself is
 * imported on the client, so the serialized payload stays tiny and the full
 * translator API, including plural selection, is available in components.
 */
export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const translator = useMemo(() => createTranslator(locale), [locale]);
  return <I18nContext.Provider value={translator}>{children}</I18nContext.Provider>;
}

export function useI18n(): Translator {
  const translator = useContext(I18nContext);
  if (!translator) {
    throw new Error("useI18n must be used inside I18nProvider.");
  }
  return translator;
}
