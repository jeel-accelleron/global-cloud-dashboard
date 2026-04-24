import { useMemo } from 'react';
import type { WorkItem } from '../../api/types';
import { cn } from '../../lib/utils';

interface Props {
  items: WorkItem[];
  year: number;
  onSelect?: (item: WorkItem) => void;
}

const STATE_FILL: Record<string, string> = {
  New: '#3b82f6',
  Active: '#6366f1',
  'In Progress': '#6366f1',
  Resolved: '#f59e0b',
  Closed: '#10b981',
  Done: '#10b981',
  Completed: '#10b981',
  Removed: '#94a3b8',
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function GanttChart({ items, year, onSelect }: Props) {
  // Visible window pads one month on each side: Dec(prev) … Jan(next)
  const yearStart = useMemo(() => new Date(year - 1, 11, 1), [year]);
  const yearEnd = useMemo(() => new Date(year + 1, 0, 31, 23, 59, 59), [year]);
  const totalMs = yearEnd.getTime() - yearStart.getTime();

  // Build rows for ALL items. Items without a planned schedule show a 'No dates' indicator.
  // Finish Date = TargetDate (Feature) || FinishDate || DueDate. NEVER use ClosedDate (actual completion).
  const rows = useMemo(() => {
    return items
      .map((it) => {
        const startRaw = it.startDate ? new Date(it.startDate) : null;
        const finishSrc = it.targetDate ?? it.finishDate ?? it.dueDate ?? null;
        const endRaw = finishSrc ? new Date(finishSrc) : null;
        if (!startRaw && !endRaw) {
          return { item: it, start: null, end: null };
        }
        const start = startRaw ?? endRaw!;
        const end = endRaw ?? startRaw!;
        // Clip to year
        const s = new Date(Math.max(start.getTime(), yearStart.getTime()));
        const e = new Date(Math.min(end.getTime(), yearEnd.getTime()));
        if (e.getTime() < yearStart.getTime() || s.getTime() > yearEnd.getTime()) {
          return { item: it, start: null, end: null };
        }
        if (e.getTime() < s.getTime()) return { item: it, start: null, end: null };
        return { item: it, start: s, end: e };
      })
      .filter(Boolean) as { item: WorkItem; start: Date | null; end: Date | null }[];
  }, [items, yearStart, yearEnd]);

  // Sort by assignee (then by start date)
  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const an = (a.item.assignedTo || 'zzz_Unassigned').toLowerCase();
        const bn = (b.item.assignedTo || 'zzz_Unassigned').toLowerCase();
        if (an !== bn) return an < bn ? -1 : 1;
        if (a.start && !b.start) return -1;
        if (!a.start && b.start) return 1;
        if (!a.start && !b.start) return 0;
        return a.start!.getTime() - b.start!.getTime();
      }),
    [rows]
  );

  const months = useMemo(() => {
    const arr: { label: string; offsetPct: number; widthPct: number; isPad: boolean }[] = [];
    // 14 months: Dec(year-1), Jan..Dec(year), Jan(year+1)
    for (let i = 0; i < 14; i++) {
      const ms = new Date(year - 1, 11 + i, 1);
      const me = new Date(year - 1, 12 + i, 1);
      const offset = ((ms.getTime() - yearStart.getTime()) / totalMs) * 100;
      const width = ((me.getTime() - ms.getTime()) / totalMs) * 100;
      const isPad = i === 0 || i === 13;
      const label = isPad
        ? `${ms.toLocaleString(undefined, { month: 'short' })} '${String(ms.getFullYear()).slice(-2)}`
        : ms.toLocaleString(undefined, { month: 'short' });
      arr.push({ label, offsetPct: offset, widthPct: width, isPad });
    }
    return arr;
  }, [year, yearStart, totalMs]);

  const today = new Date();
  const showToday =
    today.getTime() >= yearStart.getTime() && today.getTime() <= yearEnd.getTime();
  const todayPct = showToday
    ? ((today.getTime() - yearStart.getTime()) / totalMs) * 100
    : null;

  if (sorted.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-sm text-subtle">
        No projects in {year}.
      </div>
    );
  }

  const ROW_HEIGHT = 56;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[900px]">
        <div className="border-b border-border bg-muted/40">
          <div className="flex h-9 items-stretch">
            {months.map((m) => (
              <div
                key={m.label}
                style={{ width: `${m.widthPct}%` }}
                className={cn(
                  'border-l border-border px-2 py-2 text-[11px] font-medium first:border-l-0',
                  m.isPad ? 'bg-muted/40 text-subtle/70 italic' : 'text-subtle'
                )}
              >
                {m.label}
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          {sorted.map(({ item, start, end }, idx) => {
            const hasDates = start !== null && end !== null;
            const offsetPct = hasDates
              ? ((start!.getTime() - yearStart.getTime()) / totalMs) * 100
              : 0;
            const widthPct = hasDates
              ? Math.max(0.6, ((end!.getTime() - start!.getTime()) / totalMs) * 100)
              : 0;
            const fill = STATE_FILL[item.state] ?? '#6366f1';
            const assignee = item.assignedTo || 'Unassigned';
            // If bar is wide enough (>= ~12% of year, ~6 weeks), put label inside; otherwise show beside the bar.
            const labelInside = hasDates && widthPct >= 12;
            return (
              <div
                key={item.id}
                role={onSelect ? 'button' : undefined}
                tabIndex={onSelect ? 0 : undefined}
                onClick={onSelect ? () => onSelect(item) : undefined}
                onKeyDown={
                  onSelect
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelect(item);
                        }
                      }
                    : undefined
                }
                className={cn(
                  'relative border-b border-border last:border-0',
                  idx % 2 === 1 && 'bg-muted/20',
                  onSelect && 'cursor-pointer hover:bg-brand/5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand/40'
                )}
                style={{ height: ROW_HEIGHT }}
              >
                {months.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      left: `${m.offsetPct}%`,
                      width: `${m.widthPct}%`,
                    }}
                    className={cn(
                      'pointer-events-none absolute top-0 h-full border-l border-border first:border-l-0',
                      m.isPad && 'bg-muted/30'
                    )}
                  />
                ))}
                {hasDates ? (
                  <>
                    <div
                      className="absolute top-1/2 flex h-10 -translate-y-1/2 flex-col justify-center overflow-hidden rounded-md px-2 shadow-sm transition-transform hover:scale-y-105"
                      style={{
                        left: `${offsetPct}%`,
                        width: `${widthPct}%`,
                        backgroundColor: fill,
                        opacity: 0.92,
                      }}
                      title={`${item.title}\n${start!.toDateString()} \u2192 ${end!.toDateString()}\nState: ${item.state}\nAssignee: ${assignee}`}
                    >
                      {labelInside && (
                        <>
                          <span className="truncate text-[12px] font-semibold leading-tight text-white">
                            <span className="opacity-80">#{item.id}</span> {item.title}
                          </span>
                          <span className="truncate text-[10px] font-normal leading-tight text-white/85">
                            {assignee}
                          </span>
                        </>
                      )}
                    </div>
                    {!labelInside && (
                      <div
                        className="pointer-events-none absolute top-1/2 flex -translate-y-1/2 flex-col leading-tight"
                        style={{
                          left: `calc(${offsetPct + widthPct}% + 6px)`,
                          maxWidth: `calc(${100 - (offsetPct + widthPct)}% - 8px)`,
                        }}
                        title={`${item.title} \u2014 ${assignee}`}
                      >
                        <span className="truncate whitespace-nowrap text-[12px] font-semibold text-fg">
                          <span className="text-subtle">#{item.id}</span> {item.title}
                        </span>
                        <span className="truncate whitespace-nowrap text-[10px] font-normal text-subtle">
                          {assignee}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    className="absolute left-2 top-1/2 flex max-w-[calc(100%-16px)] -translate-y-1/2 flex-col rounded-md border border-dashed border-border bg-muted/40 px-2 py-1 leading-tight"
                    title={`${item.title} \u2014 ${assignee}\nNo Start or Finish (Target) date set`}
                  >
                    <span className="truncate text-[12px] font-semibold text-fg">
                      <span className="text-subtle">#{item.id}</span> {item.title}
                      <span className="ml-2 text-[10px] font-normal italic text-subtle">No dates</span>
                    </span>
                    <span className="truncate text-[10px] font-normal text-subtle">
                      {assignee}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {todayPct !== null && (
            <>
              <div
                className="pointer-events-none absolute top-0 z-10 h-full w-px bg-danger"
                style={{ left: `${todayPct}%` }}
              />
              <div
                className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-md bg-danger px-1.5 py-0.5 text-[10px] font-semibold text-white shadow"
                style={{ left: `${todayPct}%` }}
              >
                Today
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
