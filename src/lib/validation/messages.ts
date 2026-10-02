import type { Translator } from "@/lib/i18n/translate";
import type { Dictionary } from "@/lib/i18n/types";
import { VALIDATION_VARS } from "./limits";

type ValidationKey = keyof Dictionary["validation"];

function isValidationKey(value: string, dict: Dictionary): value is ValidationKey {
  return value in dict.validation;
}

/**
 * Schemas carry dictionary keys as their messages rather than English text, so
 * the same rule produces a correct message in either language. Anything that is
 * not a known key falls back to the generic required message.
 */
export function validationMessage(key: string, t: Translator): string {
  if (!isValidationKey(key, t.dict)) return t.dict.validation.required;
  const template = t.dict.validation[key];
  if (typeof template !== "string") return t.dict.validation.required;
  return t.fmt(template, VALIDATION_VARS[key]);
}

/** Translates a whole field error map coming back from a server action. */
export function translateFieldErrors(
  fieldErrors: Record<string, string> | undefined,
  t: Translator,
): Record<string, string> {
  if (!fieldErrors) return {};
  const result: Record<string, string> = {};
  for (const [field, key] of Object.entries(fieldErrors)) {
    result[field] = validationMessage(key, t);
  }
  return result;
}
