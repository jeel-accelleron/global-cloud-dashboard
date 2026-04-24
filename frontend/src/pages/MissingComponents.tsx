import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  CalendarClock,
  CalendarX,
  ExternalLink,
  FileQuestion,
  Flag,
  UserX,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { ChartContainer } from '../components/ui/ChartContainer';
import { ErrorState } from '../components/ui/ErrorState';
import { SkeletonCard } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useWorkItems } from '../hooks/useWorkItems';
import type { WorkItem } from '../api/types';
import { cn } from '../lib/utils';

type Tone = 'info' | 'warning' | 'success' | 'danger' | 'brand';

interface Bucket {
  key: string;
  label: string;
  description: string;
  match: (it: WorkItem) => boolean;
  tone: Tone;
  color: string;
  icon: typeof FileQuestion;
}

/** Strip HTML tags and check if there is any meaningful text. */
function hasDescription(it: WorkItem): boolean {
  const raw =
    (it.raw.fields?.['System.Description'] as string | undefined) ??
    (it.raw.fields?.['Microsoft.VSTS.Common.AcceptanceCriteria'] as
      | string
      | undefined) ??
    '';
  if (!raw) return false;
  const text = raw.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  return text.length > 0;
}

const TERMINAL_STATES = new Set([
  'done',
  'closed',
  'resolved',
  'completed',
  'removed',
  'cut',
]);

function isOpen(it: WorkItem): boolean {
  return !TERMINAL_STATES.has((it.state || '').toLowerCase());
}

/** Earliest non-empty finish/target/due date as a timestamp. */
function earliestDueTs(it: WorkItem): number | null {
  const candidates = [it.finishDate, it.targetDate, it.dueDate]
    .filter((d): d is string => Boolean(d))
    .map((d) => new Date(d).getTime())
    .filter((t) => Number.isFinite(t));
  if (candidates.length === 0) return null;
  return Math.min(...candidates);
}

/** Start of today (local) as ms timestamp. */
const startOfTodayTs = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
})();

const BUCKETS: Bucket[] = [
  {
    key: 'description',
    label: 'Missing Description',
    description: 'Open work items without a description / acceptance criteria',
    match: (it) => isOpen(it) && !hasDescription(it),
    tone: 'brand',
    color: '#6366f1',
    icon: FileQuestion,
  },
  {
    key: 'finishDate',
    label: 'Missing Finish Date',
    description: 'Open work items without a target / finish / due date',
    match: (it) =>
      isOpen(it) && !it.finishDate && !it.targetDate && !it.dueDate,
    tone: 'warning',
    color: '#f59e0b',
    icon: CalendarX,
  },
  {
    key: 'assignee',
    label: 'Missing Assignee',
    description: 'Open work items that are unassigned',
    match: (it) => isOpen(it) && !it.assignedTo,
    tone: 'danger',
    color: '#ef4444',
    icon: UserX,
  },
  {
    key: 'priority',
    label: 'Missing Priority',
    description: 'Open work items without a priority value',
    match: (it) => isOpen(it) && (it.priority === null || it.priority === undefined),
    tone: 'info',
    color: '#3b82f6',
    icon: Flag,
  },
  {
    key: 'overdue',
    label: 'Overdue',
    description: 'Open work items whose finish / target / due date is before today',
    match: (it) => {
      if (!isOpen(it)) return false;
      const ts = earliestDueTs(it);
      return ts !== null && ts < startOfTodayTs;
    },
    tone: 'danger',
    color: '#dc2626',
    icon: CalendarClock,
  },
];

const TONE_CARD: Record<Tone, string> = {
  brand: 'bg-brand/10 text-brand border-brand/30',
  info: 'bg-info/10 text-info border-info/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  success: 'bg-success/10 text-success border-success/30',
  danger: 'bg-danger/10 text-danger border-danger/30',
};

const TONE_ICON: Record<Tone, string> = {
  brand: 'bg-brand/15 text-brand',
  info: 'bg-info/15 text-info',
  warning: 'bg-warning/15 text-warning',
  success: 'bg-success/15 text-success',
  danger: 'bg-danger/15 text-danger',
};

const TOOLTIP_STYLE = {
  background: 'rgb(var(--elevated))',
  border: '1px solid rgb(var(--border))',
  borderRadius: 12,
  fontSize: 12,
} as const;

function tally(items: WorkItem[], pick: (it: WorkItem) => string) {
  const map = new Map<string, number>();
  for (const it of items) {
    const k = pick(it) || 'Unknown';
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

function adoUrl(it: WorkItem): string | null {
  return it.raw.url
    ? it.raw.url.replace('/_apis/wit/workItems/', '/_workitems/edit/')
    : null;
}

function BucketKpi({
  bucket,
  count,
  total,
  loading,
}: {
  bucket: Bucket;
  count: number;
  total: number;
  loading: boolean;
}) {
  const Icon = bucket.icon;
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <Card className={cn('h-full border-2', TONE_CARD[bucket.tone])}>
      <CardBody className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
            {bucket.label}
          </div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-fg">
            {loading ? (
              <span className="skeleton inline-block h-9 w-16" />
            ) : (
              count
            )}
          </div>
          <div className="mt-2 text-xs text-subtle">
            {pct}% of open items
          </div>
        </div>
        <div className={cn('rounded-xl p-2.5', TONE_ICON[bucket.tone])}>
          <Icon size={18} />
        </div>
      </CardBody>
    </Card>
  );
}

function BucketChart({
  title,
  description,
  items,
  pick,
  color,
}: {
  title: string;
  description: string;
  items: WorkItem[];
  pick: (it: WorkItem) => string;
  color: string;
}) {
  const data = useMemo(() => tally(items, pick), [items, pick]);
  return (
    <ChartContainer
      title={title}
      description={data.length === 0 ? 'No data' : description}
      height={260}
    >
      {data.length === 0 ? (
        <div className="flex h-full items-center justify-center text-xs text-subtle">
          Nothing missing
        </div>
      ) : (
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 6, right: 28, left: 8, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
          <XAxis
            type="number"
            stroke="rgb(var(--subtle))"
            fontSize={11}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="rgb(var(--subtle))"
            fontSize={11}
            width={120}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: 'rgb(var(--muted))' }}
          />
          <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]}>
            <LabelList
              dataKey="value"
              position="right"
              className="fill-fg"
              fontSize={11}
            />
          </Bar>
        </BarChart>
      )}
    </ChartContainer>
  );
}

function BucketList({ bucket, items }: { bucket: Bucket; items: WorkItem[] }) {
  const navigate = useNavigate();
  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        const ad = a.changedDate ? new Date(a.changedDate).getTime() : 0;
        const bd = b.changedDate ? new Date(b.changedDate).getTime() : 0;
        return bd - ad;
      }),
    [items]
  );
  return (
    <Card className="h-full">
      <CardHeader
        title={`${bucket.label} (${items.length})`}
        description="Most recently updated"
      />
      <CardBody className="p-0">
        {sorted.length === 0 ? (
          <EmptyState
            title="All clean"
            description="No work items are missing this field."
          />
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface text-left text-[11px] uppercase tracking-wide text-subtle">
                <tr className="border-b border-border">
                  <th className="px-4 py-2 font-medium">Title</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Assigned</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((it) => {
                  const url = adoUrl(it);
                  return (
                    <tr
                      key={it.id}
                      className="group cursor-pointer border-b border-border/50 last:border-0 hover:bg-muted/40"
                      onClick={() => navigate(`/work-items?q=${it.id}`)}
                    >
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-subtle">
                            #{it.id}
                          </span>
                          <span
                            className="truncate text-fg"
                            title={it.title}
                          >
                            {it.title}
                          </span>
                          {url && (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="ml-auto text-subtle opacity-0 transition-opacity hover:text-brand group-hover:opacity-100"
                              title="Open in Azure DevOps"
                            >
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-xs text-subtle">
                        {it.type}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-xs text-subtle">
                        {it.assignedTo || 'Unassigned'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default function MissingComponents() {
  const { data, loading, error, refetch } = useWorkItems({ top: 2000 });

  const openItems = useMemo(() => data.filter(isOpen), [data]);

  const grouped = useMemo(() => {
    const out: Record<string, WorkItem[]> = {};
    for (const b of BUCKETS) out[b.key] = data.filter(b.match);
    return out;
  }, [data]);

  return (
    <>
      <PageHeader
        title="Missing Components"
        description="Open work items missing key fields — description, dates, owner, priority"
      />

      {error && <ErrorState message={error} onRetry={refetch} />}

      {!error && (
        <div className="space-y-4">
          {/* Top KPI strip */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))
              : BUCKETS.map((b) => (
                  <BucketKpi
                    key={b.key}
                    bucket={b}
                    count={grouped[b.key].length}
                    total={openItems.length}
                    loading={loading}
                  />
                ))}
          </div>

          {/* Per-bucket row: chart by type | chart by assignee | list */}
          {loading ? (
            <SkeletonCard />
          ) : (
            BUCKETS.map((b) => {
              const items = grouped[b.key];
              return (
                <Card key={b.key}>
                  <CardHeader
                    title={b.label}
                    description={b.description}
                    action={
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                          TONE_CARD[b.tone]
                        )}
                      >
                        <AlertTriangle size={12} />
                        {items.length}
                      </span>
                    }
                  />
                  <CardBody>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                      <div className="lg:col-span-4">
                        <BucketChart
                          title="By Type"
                          description={`Top ${Math.min(10, items.length)} types`}
                          items={items}
                          pick={(it) => it.type}
                          color={b.color}
                        />
                      </div>
                      <div className="lg:col-span-4">
                        <BucketChart
                          title="By Assignee"
                          description={`Top ${Math.min(10, items.length)} owners`}
                          items={items}
                          pick={(it) => it.assignedTo || 'Unassigned'}
                          color={b.color}
                        />
                      </div>
                      <div className="lg:col-span-4">
                        <BucketList bucket={b} items={items} />
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })
          )}
        </div>
      )}
    </>
  );
}
