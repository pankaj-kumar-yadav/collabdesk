import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type PageSkeletonProps = {
  className?: string;
};

/** Generic page shell — title + body blocks. */
export function PageSkeleton(props: PageSkeletonProps) {
  const { className } = props;

  return (
    <div
      className={cn("flex-1 space-y-6 overflow-auto p-4 md:p-6", className)}
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}

type DetailPageSkeletonProps = {
  className?: string;
};

/** Detail layout — header + main pane. */
export function DetailPageSkeleton(props: DetailPageSkeletonProps) {
  const { className } = props;

  return (
    <div
      className={cn("flex min-h-0 w-full flex-1", className)}
      aria-busy="true"
      aria-label="Loading details"
    >
      <div className="hidden w-64 shrink-0 flex-col gap-3 border-r border-border/80 p-3 md:flex">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="mt-4 h-5 w-24" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      <div className="flex min-h-[20rem] min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        <Skeleton className="min-h-[16rem] w-full flex-1 rounded-lg" />
      </div>
    </div>
  );
}

type WorkspacesPageSkeletonProps = {
  className?: string;
};

/** Home workspace card grid. */
export function WorkspacesPageSkeleton(props: WorkspacesPageSkeletonProps) {
  const { className } = props;

  return (
    <div
      className={cn("flex-1 overflow-auto p-4 md:p-6", className)}
      aria-busy="true"
      aria-label="Loading workspaces"
    >
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
      <div className="mb-4 space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <WorkspaceCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

function WorkspaceCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Skeleton className="mb-4 h-4 w-28" />
      <div className="flex gap-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

type SidebarWorkspaceListSkeletonProps = {
  count?: number;
};

export function SidebarWorkspaceListSkeleton(
  props: SidebarWorkspaceListSkeletonProps,
) {
  const { count = 4 } = props;

  return (
    <div className="space-y-2 px-2" aria-busy="true" aria-label="Loading workspaces">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-8 w-full" />
      ))}
    </div>
  );
}
