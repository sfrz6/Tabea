"use server";

import { revalidatePath } from "next/cache";
import { requireActorOrThrow } from "@/lib/auth/current-user";
import {
  actionError,
  actionOk,
  toActionResult,
  type ActionResult,
} from "@/lib/errors";
import {
  createTaxonomySchema,
  toFieldErrors,
  toggleTaxonomySchema,
} from "@/lib/validation/schemas";
import { createTaxonomyItem, setTaxonomyActive } from "./service";

export type TaxonomyFormState = ActionResult<undefined>;

export async function createTaxonomyAction(
  _previous: TaxonomyFormState | undefined,
  formData: FormData,
): Promise<TaxonomyFormState> {
  try {
    const { actor } = await requireActorOrThrow();

    const parsed = createTaxonomySchema.safeParse({
      kind: formData.get("kind") ?? "",
      name: formData.get("name") ?? "",
      nameAr: formData.get("nameAr") ?? "",
    });

    if (!parsed.success) {
      return actionError("VALIDATION", { fieldErrors: toFieldErrors(parsed.error) });
    }

    await createTaxonomyItem(actor, parsed.data);
    revalidatePath("/admin/settings");

    return actionOk();
  } catch (error) {
    return toActionResult(error);
  }
}

export async function toggleTaxonomyAction(
  _previous: TaxonomyFormState | undefined,
  formData: FormData,
): Promise<TaxonomyFormState> {
  try {
    const { actor } = await requireActorOrThrow();

    const parsed = toggleTaxonomySchema.safeParse({
      kind: formData.get("kind") ?? "",
      id: formData.get("id") ?? "",
      isActive: formData.get("isActive") === "true",
    });

    if (!parsed.success) {
      return actionError("VALIDATION", { fieldErrors: toFieldErrors(parsed.error) });
    }

    await setTaxonomyActive(actor, parsed.data);
    revalidatePath("/admin/settings");

    return actionOk();
  } catch (error) {
    return toActionResult(error);
  }
}
