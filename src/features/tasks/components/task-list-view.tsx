import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildQuery, cn } from "@/lib/utils";
import type { Translator } from "@/lib/i18n/translate";
import { formatNumber } from "@/lib/i18n/format";
import { EmptyState } from "@/components/ui/surface";
import type { TaskFilters } from "@/lib/validation/schemas";
import type { TaskListResult } from "../queries";
import { TaskCard, TaskCardList } from "./task-card";

/** Chooses wording that matches why the list is empty, rather than one generic line. */
function emptyCopy(filters: TaskFilters, t: Translator) {
  const { dict } = t;

  if (filters.search) {
    return {
      title: t.fmt(dict.tasks.empty.noSearchResults, { query: filters.search }),
      description: dict.tasks.empty.noMatchesHint,
    };
  }

  const hasFilters = Boolean(
    filters.status ||
      filters.priority ||
      filters.assigneeId ||
      filters.projectId ||
      filters.categoryId,
  );

  if (hasFilters) {
    return {
      title: dict.tasks.empty.noMatches,
      description: dict.tasks.empty.noMatchesHint,
    };
  }

  switch (filters.quick) {
    case "overdue":
      return { title: dict.tasks.empty.noOverdue, description: undefined };
    case "today":
      return { title: dict.tasks.empty.noToday, description: undefined };
    case "upcoming":
      return { title: dict.tasks.empty.noUpcoming, description: undefined };
    case "completed":
      return { title: dict.tasks.empty.noCompleted, description: undefined };
    default:
      return { title: dict.tasks.empty.none, description: dict.tasks.empty.noneHint };
  }
}

export function TaskListView({
  result,
  filters,
  t,
  basePath,
  showAssignee,
  now = new Date(),
}: {
  result: TaskListResult;
  filters: TaskFilters;
  t: Translator;
  basePath: string;
  showAssignee: boolean;
  now?: Date;
}) {
  if (result.items.length === 0) {
    const copy = emptyCopy(filters, t);
    return <EmptyState title={copy.title} description={copy.description} />;
  }

  return (
    <div className="space-y-4">
      <TaskCardList>
        {result.items.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            t={t}
            now={now}
            showAssignee={showAssignee}
          />
        ))}
      </TaskCardList>

      <Pagination result={result} filters={filters} t={t} basePath={basePath} />
    </div>
  );
}

function Pagination({
  result,
  filters,
  t,
  basePath,
}: {
  result: TaskListResult;
  filters: TaskFilters;
  t: Translator;
  basePath: string;
}) {
  if (result.pageCount <= 1) return null;

  const Previous = t.locale === "ar" ? ChevronRight : ChevronLeft;
  const Next = t.locale === "ar" ? ChevronLeft : ChevronRight;

  const linkTo = (page: number): string =>
    `${basePath}${buildQuery({
      quick: filters.quick === "all" ? undefined : filters.quick,
      status: filters.status,
      priority: filters.priority,
      assigneeId: filters.assigneeId,
      projectId: filters.projectId,
      categoryId: filters.categoryId,
      search: filters.search,
      sort: filters.sort === "dueDate" ? undefined : filters.sort,
      page: page === 1 ? undefined : page,
    })}`;

  const base = cn(
    "inline-flex min-h-11 items-center gap-1 rounded-[var(--radius-control)] border",
    "border-border bg-surface px-3 text-sm font-medium text-ink-muted",
    "transition-colors hover:border-border-strong hover:text-ink",
  );

  return (
    <nav className="flex items-center justify-between gap-3 pt-1">
      {result.page > 1 ? (
        <Link href={linkTo(result.page - 1)} className={base} rel="prev">
          <Previous aria-hidden size={16} />
          {t.dict.common.back}
        </Link>
      ) : (
        <span />
      )}

      <span className="text-xs text-ink-subtle tabular">
        {formatNumber(result.page, t.locale)} / {formatNumber(result.pageCount, t.locale)}
      </span>

      {result.page < result.pageCount ? (
        <Link href={linkTo(result.page + 1)} className={base} rel="next">
          {t.dict.common.next}
          <Next aria-hidden size={16} />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
