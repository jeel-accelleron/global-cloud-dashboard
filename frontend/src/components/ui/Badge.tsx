import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

const stateColors: Record<string, string> = {
  New: 'bg-info/10 text-info border-info/20',
  Active: 'bg-brand/10 text-brand border-brand/20',
  'In Progress': 'bg-brand/10 text-brand border-brand/20',
  Resolved: 'bg-warning/10 text-warning border-warning/20',
  Closed: 'bg-success/10 text-success border-success/20',
  Done: 'bg-success/10 text-success border-success/20',
  Completed: 'bg-success/10 text-success border-success/20',
  Removed: 'bg-muted text-subtle border-border',
};

const priorityColors: Record<number, string> = {
  1: 'bg-danger/10 text-danger border-danger/20',
  2: 'bg-warning/10 text-warning border-warning/20',
  3: 'bg-info/10 text-info border-info/20',
  4: 'bg-muted text-subtle border-border',
};

const typeColors: Record<string, string> = {
  Bug: 'bg-danger/10 text-danger border-danger/20',
  Task: 'bg-info/10 text-info border-info/20',
  'User Story': 'bg-brand/10 text-brand border-brand/20',
  Feature: 'bg-warning/10 text-warning border-warning/20',
  Epic: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

export function Badge({
  children,
  className,
  tone = 'default',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'default' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const toneCls: Record<string, string> = {
    default: 'bg-muted text-subtle border-border',
    brand: 'bg-brand/10 text-brand border-brand/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    danger: 'bg-danger/10 text-danger border-danger/20',
    info: 'bg-info/10 text-info border-info/20',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none',
        toneCls[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StateBadge({ state }: { state: string }) {
  const cls = stateColors[state] ?? 'bg-muted text-subtle border-border';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none',
        cls
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
      {state}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: number | null }) {
  if (priority === null || priority === undefined)
    return <span className="text-xs text-subtle">—</span>;
  const cls = priorityColors[priority] ?? 'bg-muted text-subtle border-border';
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-semibold leading-none',
        cls
      )}
    >
      P{priority}
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  const cls = typeColors[type] ?? 'bg-muted text-subtle border-border';
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-none',
        cls
      )}
    >
      {type}
    </span>
  );
}
