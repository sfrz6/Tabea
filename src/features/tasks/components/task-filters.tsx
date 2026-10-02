"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { buildQuery, cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Field, Select, TextInput } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import type { TaskPriority, TaskStatus } from "@/db/schema";

export type FilterOption = { id: string; name: string; nameAr?: string | null };

const QUICK_FILTERS = ["all", "today", "overdue", "upcoming", "open", "completed"] as const;
type QuickFilter = (typeof QUICK_FILTERS)[number];

const STATUSES: TaskStatus[] = ["NEW", "IN_PROGRESS", "WAITING", "COMPLETED", "CANCELLED"];
const PRIORITIES: TaskPriority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];
const SORTS = ["dueDate", "priority", "newest", "oldest", "recentlyUpdated"] as const;

/**
 * Filters live in the URL rather than in component state. A filtered view can
 * then be bookmarked, shared or reached from a dashboard tile, and the back
 * button behaves the way people expect on a phone.
 */
export function TaskFilters({
  assignees,
  projects,
  categories,
  showAssigneeFilter,
  resultCount,
}: {
  assignees: FilterOption[];
  projects: FilterOption[];
  categories: FilterOption[];
  showAssigneeFilter: boolean;
  resultCount: number;
}) {
  const t = useI18n();
  const { dict, locale } = t;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  const searchId = useId();
  const statusId = useId();
  const priorityId = useId();
  const assigneeId = useId();
  const projectId = useId();
  const categoryId = useId();
  const sortId = useId();

  const current = {
    quick: (params.get("quick") ?? "all") as QuickFilter,
    status: params.get("status") ?? "",
    priority: params.get("priority") ?? "",
    assigneeId: params.get("assigneeId") ?? "",
    projectId: params.get("projectId") ?? "",
    categoryId: params.get("categoryId") ?? "",
    search: params.get("search") ?? "",
    sort: params.get("sort") ?? "dueDate",
  };

  const advancedCount = [
    current.status,
    current.priority,
    current.assigneeId,
    current.projectId,
    current.categoryId,
  ].filter(Boolean).length;

  function hrefWith(changes: Record<string, string | undefined>): string {
    return `${pathname}${buildQuery({ ...current, quick: current.quick === "all" ? undefined : current.quick, ...changes, page: undefined })}`;
  }

  function apply(formData: FormData): void {
    const next = {
      ...current,
      quick: current.quick === "all" ? undefined : current.quick,
      status: String(formData.get("status") ?? ""),
      priority: String(formData.get("priority") ?? ""),
      assigneeId: String(formData.get("assigneeId") ?? ""),
      projectId: String(formData.get("projectId") ?? ""),
      categoryId: String(formData.get("categoryId") ?? ""),
      sort: String(formData.get("sort") ?? "dueDate"),
      page: undefined,
    };
    setSheetOpen(false);
    router.push(`${pathname}${buildQuery(next)}`);
  }

  function submitSearch(formData: FormData): void {
    const term = String(formData.get("search") ?? "").trim();
    router.push(hrefWith({ search: term || undefined }));
  }

  const optionLabel = (option: FilterOption): string =>
    locale === "ar" && option.nameAr ? option.nameAr : option.name;

  return (
    <div className="space-y-3">
      {/* A swipeable rail keeps six quick views reachable without eating height. */}
      <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-2">
          {QUICK_FILTERS.map((key) => {
            const active = current.quick === key;
            const label =
              key === "all"
                ? dict.common.all
                : key === "open"
                  ? dict.tasks.filters.open
                  : key === "completed"
                    ? dict.tasks.filters.completed
                    : dict.tasks.filters[key];

            return (
              <Link
                key={key}
                href={hrefWith({ quick: key === "all" ? undefined : key })}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm font-medium",
                  "whitespace-nowrap transition-colors",
                  active
                    ? "border-brand bg-brand text-on-brand"
                    : "border-border bg-surface text-ink-muted hover:border-border-strong hover:text-ink",
                )}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <form action={submitSearch} className="relative min-w-0 flex-1">
          <label htmlFor={searchId} className="sr-only">
            {dict.common.search}
          </label>
          <TextInput
            id={searchId}
            name="search"
            type="search"
            inputMode="search"
            enterKeyHint="search"
            defaultValue={current.search}
            placeholder={dict.common.searchPlaceholder}
            autoComplete="off"
            className="ps-10"
          />
          <Search
            aria-hidden
            size={17}
            className="pointer-events-none absolute inset-y-0 start-3 my-auto text-ink-subtle"
          />
        </form>

        <Button
          variant={advancedCount > 0 ? "subtle" : "secondary"}
          onClick={() => setSheetOpen(true)}
          aria-label={dict.common.filters}
          className="shrink-0"
        >
          <SlidersHorizontal aria-hidden size={17} />
          <span className="hidden sm:inline">{dict.common.filters}</span>
          {advancedCount > 0 ? (
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-brand text-[0.6875rem] font-bold text-on-brand">
              {advancedCount}
            </span>
          ) : null}
        </Button>
      </div>

      {(advancedCount > 0 || current.search) && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-ink-subtle">
            {t.plural(dict.common.resultsCount, resultCount)}
          </p>
          <Link
            href={pathname}
            className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline"
          >
            <X aria-hidden size={13} />
            {dict.common.clearAll}
          </Link>
        </div>
      )}

      <Modal
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={dict.common.filters}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setSheetOpen(false)}>
              {dict.common.cancel}
            </Button>
            <Button type="submit" form="task-filters-form" variant="primary">
              {dict.common.apply}
            </Button>
          </>
        }
      >
        <form id="task-filters-form" action={apply} className="space-y-4 pb-2">
          <Field htmlFor={statusId} label={dict.tasks.filters.status}>
            <Select id={statusId} name="status" defaultValue={current.status}>
              <option value="">{dict.tasks.filters.anyStatus}</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {dict.status[status]}
                </option>
              ))}
            </Select>
          </Field>

          <Field htmlFor={priorityId} label={dict.tasks.filters.priority}>
            <Select id={priorityId} name="priority" defaultValue={current.priority}>
              <option value="">{dict.tasks.filters.anyPriority}</option>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {dict.priority[priority]}
                </option>
              ))}
            </Select>
          </Field>

          {showAssigneeFilter ? (
            <Field htmlFor={assigneeId} label={dict.tasks.filters.assignee}>
              <Select id={assigneeId} name="assigneeId" defaultValue={current.assigneeId}>
                <option value="">{dict.tasks.filters.anyAssignee}</option>
                {assignees.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          {projects.length > 0 ? (
            <Field htmlFor={projectId} label={dict.tasks.filters.project}>
              <Select id={projectId} name="projectId" defaultValue={current.projectId}>
                <option value="">{dict.tasks.filters.anyProject}</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {optionLabel(project)}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          {categories.length > 0 ? (
            <Field htmlFor={categoryId} label={dict.tasks.filters.category}>
              <Select id={categoryId} name="categoryId" defaultValue={current.categoryId}>
                <option value="">{dict.tasks.filters.anyCategory}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {optionLabel(category)}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <Field htmlFor={sortId} label={dict.common.sortBy}>
            <Select id={sortId} name="sort" defaultValue={current.sort}>
              {SORTS.map((sort) => (
                <option key={sort} value={sort}>
                  {dict.tasks.sort[sort]}
                </option>
              ))}
            </Select>
          </Field>
        </form>
      </Modal>
    </div>
  );
}
