import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, projects } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { canManageProjectsAndCategories, type Actor } from "@/lib/permissions";

export type TaxonomyKind = "project" | "category";

export type TaxonomyRow = {
  id: string;
  name: string;
  nameAr: string | null;
  isActive: boolean;
};

function tableFor(kind: TaxonomyKind) {
  return kind === "project" ? projects : categories;
}

/** Projects and categories stay deliberately simple: a name per language and an on or off switch. */
export async function listTaxonomy(kind: TaxonomyKind): Promise<TaxonomyRow[]> {
  const table = tableFor(kind);
  return db
    .select({
      id: table.id,
      name: table.name,
      nameAr: table.nameAr,
      isActive: table.isActive,
    })
    .from(table)
    .orderBy(asc(table.name));
}

export async function createTaxonomyItem(
  actor: Actor,
  input: { kind: TaxonomyKind; name: string; nameAr?: string | null },
): Promise<void> {
  if (!canManageProjectsAndCategories(actor)) throw new AppError("FORBIDDEN");

  const table = tableFor(input.kind);
  await db
    .insert(table)
    .values({ name: input.name, nameAr: input.nameAr ?? null })
    .onConflictDoNothing();
}

/**
 * Archiving rather than deleting, because tasks already filed under a project
 * must keep their label. Archived entries disappear from the pickers but stay
 * readable on existing tasks.
 */
export async function setTaxonomyActive(
  actor: Actor,
  input: { kind: TaxonomyKind; id: string; isActive: boolean },
): Promise<void> {
  if (!canManageProjectsAndCategories(actor)) throw new AppError("FORBIDDEN");

  const table = tableFor(input.kind);
  await db.update(table).set({ isActive: input.isActive }).where(eq(table.id, input.id));
}
