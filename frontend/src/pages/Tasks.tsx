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
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  PlayCircle,
  Trash2,
  ExternalLink,
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
  states?: string[];
  /** Optional custom matcher; if provided, takes precedence over `states`. */
  match?: (item: WorkItem) => boolean;
  tone: Tone;
  color: string;
  icon: typeof ClipboardList;
}

const NEW_WINDOW_DAYS = 7;
const newWindowCutoff = Date.now() - NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;

const BUCKETS: Bucket[] = [
  {
    key: 'new',
    label: `New Tasks (last ${NEW_WINDOW_DAYS}d)`,
    match: (it) => {
      if (!it.createdDate) return false;
      const t = new Date(it.createdDate).getTime();
      return Number.isFinite(t) && t >= newWindowCutoff;
    },
    tone: 'brand',
    color: '#6366f1',
    icon: CircleDashed,
  },
  {
    key: 'todo',
    label: 'To-do Tasks',
    states: ['New', 'Proposed', 'To Do', 'Approved', 'Committed', 'Ready'],
    tone: 'info',
    color: '#3b82f6',
    icon: ClipboardList,
  },
  {
    key: 'inprogress',
    label: 'In Progress Tasks',
    states: ['Active', 'In Progress', 'Doing'],
    tone: 'warning',
    color: '#f59e0b',
    icon: PlayCircle,
  },
  {
    key: 'completed',
    label: 'Completed Tasks',
    states: ['Done', 'Closed', 'Resolved', 'Completed'],
    tone: 'success',
    color: '#10b981',
    icon: CheckCircle2,
  },
  {
    key: 'removed',
    label: 'Removed Tasks',
    states: ['Removed', 'Cut'],
    tone: 'danger',
    color: '#ef4444',
    icon: Trash2,
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

function tallyAssignees(items: WorkItem[]): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const it of items) {
    const name = it.assignedTo || 'Unassigned';
    map.set(name, (map.get(name) ?? 0) + 1);
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
  loading,
}: {
  bucket: Bucket;
  count: number;
  loading: boolean;
}) {
  const Icon = bucket.icon;
  return (
    <Card className={cn('h-full border-2', TONE_CARD[bucket.tone])}>
      <CardBody className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
            {bucket.label}
          </div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-fg">
            {loading ? <span className="skeleton inline-block h-9 w-16" /> : count}
          </div>
          <div className="mt-2 text-xs text-subtle">Work items</div>
        </div>
        <div className={cn('rounded-xl p-2.5', TONE_ICON[bucket.tone])}>
          <Icon size={18} />
        </div>
      </CardBody>
    </Card>
  );
}

function BucketChart({ bucket, items }: { bucket: Bucket; items: WorkItem[] }) {
  const data = useMemo(() => tallyAssignees(items), [items]);
  return (
    <ChartContainer
      title={`${bucket.label} by Assigned To`}
      description={data.length === 0 ? 'No data' : `Top ${data.length} contributors`}
      height={260}
    >
      {data.length === 0 ? (
        <div className="flex h-full items-center justify-center text-xs text-subtle">
          No work items
        </div>
      ) : (
        <BarChart data={data} layout="vertical" margin={{ top: 6, right: 28, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
          <XAxis type="number" stroke="rgb(var(--subtle))" fontSize={11} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            stroke="rgb(var(--subtle))"
            fontSize={11}
            width={120}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgb(var(--muted))' }} />
          <Bar dataKey="value" fill={bucket.color} radius={[0, 4, 4, 0]}>
            <LabelList dataKey="value" position="right" className="fill-fg" fontSize={11} />
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
          <EmptyState title="Nothing here" description="No tasks in this bucket." />
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface text-left text-[11px] uppercase tracking-wide text-subtle">
                <tr className="border-b border-border">
                  <th className="px-4 py-2 font-medium">Title</th>
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
                          <span className="font-mono text-[11px] text-subtle">#{it.id}</span>
                          <span className="truncate text-fg" title={it.title}>
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

export default function Tasks() {
  const { data, loading, error, refetch } = useWorkItems({
    type: 'Task',
    top: 2000,
  });

  const grouped = useMemo(() => {
    const out: Record<string, WorkItem[]> = {};
    for (const b of BUCKETS) out[b.key] = [];
    for (const it of data) {
      // "New" is computed by createdDate window; an item can also belong to a
      // state-based bucket (e.g. To-do). Place it in every bucket that matches.
      const s = (it.state || '').toLowerCase();
      for (const b of BUCKETS) {
        if (b.match) {
          if (b.match(it)) out[b.key].push(it);
        } else if (b.states?.some((bs) => bs.toLowerCase() === s)) {
          out[b.key].push(it);
        }
      }
    }
    return out;
  }, [data]);

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Task breakdown by status, assignee, and recency"
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
                    loading={loading}
                  />
                ))}
          </div>

          {/* Per-bucket row: chart + list inside one card */}
          {loading ? (
            <SkeletonCard />
          ) : (
            BUCKETS.map((b) => {
              const items = grouped[b.key];
              return (
                <Card key={b.key}>
                  <CardHeader
                    title={b.label}
                    description="Distribution by assignee and most recently updated items"
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
                      <div className="lg:col-span-7">
                        <BucketChart bucket={b} items={items} />
                      </div>
                      <div className="lg:col-span-5">
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
