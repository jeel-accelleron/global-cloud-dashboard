import { cn } from '../../lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton h-4 w-full', className)} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="h-7 w-32" />
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Skeleton className="h-2" />
        <Skeleton className="h-2" />
        <Skeleton className="h-2" />
      </div>
    </div>
  );
}
