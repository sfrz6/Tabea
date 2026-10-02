"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { Archive, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";
import { LIMITS } from "@/lib/validation/limits";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { Card, EmptyState, SectionHeader } from "@/components/ui/surface";
import type { TaxonomyKind, TaxonomyRow } from "../service";
import {
  createTaxonomyAction,
  toggleTaxonomyAction,
  type TaxonomyFormState,
} from "../actions";

/**
 * Projects and categories stay intentionally thin: a name in each language and
 * an archive switch. Tabea organises work, it does not try to become a project
 * management system.
 *
 * Entries are archived rather than deleted, so a task filed under a project
 * keeps its label.
 */
export function TaxonomyManager({
  kind,
  items,
}: {
  kind: TaxonomyKind;
  items: TaxonomyRow[];
}) {
  const { dict } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);

  const [createState, createAction, creating] = useActionState<
    TaxonomyFormState | undefined,
    FormData
  >(createTaxonomyAction, undefined);

  const [, toggleAction] = useActionState<TaxonomyFormState | undefined, FormData>(
    toggleTaxonomyAction,
    undefined,
  );

  const nameId = useId();
  const nameArId = useId();

  useEffect(() => {
    if (createState?.ok) formRef.current?.reset();
  }, [createState]);

  const isProject = kind === "project";

  return (
    <section className="space-y-3">
      <SectionHeader
        title={isProject ? dict.admin.projects : dict.admin.categories}
        description={isProject ? dict.admin.projectsHint : dict.admin.categoriesHint}
      />

      <Card className="p-4">
        <form ref={formRef} action={createAction} className="space-y-3">
          <input type="hidden" name="kind" value={kind} />

          <div className="grid gap-3 sm:grid-cols-2">
            <Field htmlFor={nameId} label={dict.admin.nameEnglish} required>
              <TextInput
                id={nameId}
                name="name"
                required
                maxLength={LIMITS.projectNameMax}
                autoComplete="off"
              />
            </Field>

            <Field htmlFor={nameArId} label={dict.admin.nameArabic}>
              <TextInput
                id={nameArId}
                name="nameAr"
                dir="rtl"
                maxLength={LIMITS.projectNameMax}
                autoComplete="off"
              />
            </Field>
          </div>

          <Button type="submit" variant="secondary" disabled={creating}>
            <Plus aria-hidden size={17} />
            {isProject ? dict.admin.addProject : dict.admin.addCategory}
          </Button>
        </form>
      </Card>

      {items.length === 0 ? (
        <EmptyState title={isProject ? dict.admin.noProjects : dict.admin.noCategories} />
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex min-h-14 items-center gap-3 px-4 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-sm font-medium",
                      item.isActive ? "text-ink" : "text-ink-subtle",
                    )}
                  >
                    {item.name}
                  </p>
                  {item.nameAr ? (
                    <p className="truncate text-xs text-ink-subtle" dir="rtl">
                      {item.nameAr}
                    </p>
                  ) : null}
                </div>

                {!item.isActive ? (
                  <span className="shrink-0 rounded-full bg-neutral-soft px-2 py-0.5 text-[0.6875rem] text-ink-subtle">
                    {dict.admin.archived}
                  </span>
                ) : null}

                <form action={toggleAction} className="shrink-0">
                  <input type="hidden" name="kind" value={kind} />
                  <input type="hidden" name="id" value={item.id} />
                  <input
                    type="hidden"
                    name="isActive"
                    value={item.isActive ? "false" : "true"}
                  />
                  <Button type="submit" size="sm" variant="ghost">
                    {item.isActive ? (
                      <>
                        <Archive aria-hidden size={15} />
                        {dict.admin.archive}
                      </>
                    ) : (
                      <>
                        <RotateCcw aria-hidden size={15} />
                        {dict.admin.restore}
                      </>
                    )}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
