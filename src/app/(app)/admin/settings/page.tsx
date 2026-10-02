import type { Metadata } from "next";
import { getTranslator } from "@/lib/i18n/server";
import { listTaxonomy } from "@/features/taxonomy/service";
import { TaxonomyManager } from "@/features/taxonomy/components/taxonomy-manager";
import { PageHeader } from "@/components/ui/surface";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function AdminSettingsPage() {
  const t = await getTranslator();

  const [projects, categories] = await Promise.all([
    listTaxonomy("project"),
    listTaxonomy("category"),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader title={t.dict.admin.settings} />
      <TaxonomyManager kind="project" items={projects} />
      <TaxonomyManager kind="category" items={categories} />
    </div>
  );
}
