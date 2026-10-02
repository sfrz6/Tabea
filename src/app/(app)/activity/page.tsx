import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { z } from "zod";
import { cn, buildQuery } from "@/lib/utils";
import { requireActor } from "@/lib/auth/current-user";
import { getTranslator } from "@/lib/i18n/server";
import { formatNumber } from "@/lib/i18n/format";
import { listActivity } from "@/features/activity/queries";
import { ActivityFeed } from "@/features/activity/components/activity-feed";
import { Card, EmptyState, PageHeader } from "@/components/ui/surface";

export const metadata: Metadata = {
  title: "Activity",
};

const pageSchema = z.coerce.number().int().min(1).max(1000).catch(1);

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * The full history, on its own screen rather than crowding the dashboard.
 *
 * It is scoped by the same visibility rule as the task lists, so each person
 * reads the history of exactly the work they are allowed to see.
 */
export default async function ActivityPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { actor } = await requireActor();
  const t = await getTranslator();
  const now = new Date();

  const raw = await searchParams;
  const result = await listActivity(actor, pageSchema.parse(raw.page ?? 1));

  const Previous = t.locale === "ar" ? ChevronRight : ChevronLeft;
  const Next = t.locale === "ar" ? ChevronLeft : ChevronRight;

  const pageLink = cn(
    "inline-flex min-h-11 items-center gap-1 rounded-[var(--radius-control)] border",
    "border-border bg-surface px-3 text-sm font-medium text-ink-muted",
    "transition-colors hover:border-border-strong hover:text-ink",
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.dict.activity.title}
        description={t.dict.activity.pageDescription}
      />

      {result.items.length === 0 ? (
        <EmptyState
          title={t.dict.activity.empty}
          description={t.dict.activity.emptyHint}
        />
      ) : (
        <>
          <Card className="p-4 sm:p-5">
            <ActivityFeed entries={result.items} t={t} now={now} />
          </Card>

          {result.pageCount > 1 ? (
            <nav className="flex items-center justify-between gap-3">
              {result.page > 1 ? (
                <Link
                  href={`/activity${buildQuery({ page: result.page - 1 === 1 ? undefined : result.page - 1 })}`}
                  className={pageLink}
                  rel="prev"
                >
                  <Previous aria-hidden size={16} />
                  {t.dict.common.back}
                </Link>
              ) : (
                <span />
              )}

              <span className="text-xs text-ink-subtle tabular">
                {formatNumber(result.page, t.locale)} /{" "}
                {formatNumber(result.pageCount, t.locale)}
              </span>

              {result.page < result.pageCount ? (
                <Link
                  href={`/activity${buildQuery({ page: result.page + 1 })}`}
                  className={pageLink}
                  rel="next"
                >
                  {t.dict.common.next}
                  <Next aria-hidden size={16} />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
