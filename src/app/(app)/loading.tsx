import { Skeleton, TaskCardSkeleton } from "@/components/ui/surface";

/**
 * Placeholders that match the real layout, so content lands in place instead of
 * pushing the page around while it loads.
 */
export default function AppLoading() {
  return (
    <div aria-busy="true" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <Skeleton className="h-20 rounded-[var(--radius-card)]" />
        <Skeleton className="h-20 rounded-[var(--radius-card)]" />
        <Skeleton className="h-20 rounded-[var(--radius-card)]" />
      </div>

      <div className="space-y-2.5">
        <Skeleton className="h-4 w-36" />
        <TaskCardSkeleton />
        <TaskCardSkeleton />
        <TaskCardSkeleton />
      </div>
    </div>
  );
}
