import { Skeleton } from "@/components/ui/surface";

export default function TaskDetailLoading() {
  return (
    <div aria-busy="true" className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-7 w-3/4" />
        <div className="flex gap-2.5">
          <Skeleton className="h-11 w-36 rounded-[var(--radius-control)]" />
          <Skeleton className="h-11 w-24 rounded-[var(--radius-control)]" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="order-2 space-y-4 lg:order-1">
          <Skeleton className="h-28 rounded-[var(--radius-card)]" />
          <Skeleton className="h-24 rounded-[var(--radius-card)]" />
          <Skeleton className="h-40 rounded-[var(--radius-card)]" />
        </div>
        <div className="order-1">
          <Skeleton className="h-64 rounded-[var(--radius-card)]" />
        </div>
      </div>
    </div>
  );
}
