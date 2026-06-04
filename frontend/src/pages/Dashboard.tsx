import { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  Bug,
  CalendarRange,
  CheckCircle2,
  TrendingUp,
} from '../components/icons';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '../components/layout/PageHeader';
import { ChartContainer } from '../components/ui/ChartContainer';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { DataTable, type Column } from '../components/ui/DataTable';
import { PriorityBadge, StateBadge, TypeBadge } from '../components/ui/Badge';
import { Select } from '../components/ui/Input';
import { SkeletonCard } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { KpiCard } from '../components/ui/KpiCard';
import { DataFreshness } from '../components/ui/DataFreshness';
import { useWorkItems } from '../hooks/useWorkItems';
import { countBy, isActive, isClosed, isOverdue, trendByDay } from '../lib/selectors';
import type { WorkItem } from '../api/types';
import { formatRelative } from '../lib/utils';
import { priorityColor, stateColor } from '../lib/colors';
import { useUrlParam } from '../lib/urlState';

type RangeKey = 'week' | 'month' | 'quarter' | 'year' | 'all';

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

/** Returns [startMs, endMs, days, label] for the selected range. */
function rangeBounds(key: RangeKey): {
  start: number | null;
  end: number;
  days: number;
  label: string;
} {
  const now = new Date();
  const end = now.getTime();
  if (key === 'all') {
    return { start: null, end, days: 30, label: 'all time' };
  }
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (key === 'week') {
    // Monday-anchored ISO week.
    const dow = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - dow);
  } else if (key === 'month') {
    start.setDate(1);
  } else if (key === 'quarter') {
    const qStart = Math.floor(start.getMonth() / 3) * 3;
    start.setMonth(qStart, 1);
  } else if (key === 'year') {
    start.setMonth(0, 1);
  }
  const days = Math.max(
    1,
    Math.ceil((end - start.getTime()) / 86400000)
  );
  const label =
    key === 'week'
      ? 'this week'
      : key === 'month'
      ? 'this month'
      : key === 'quarter'
      ? 'this quarter'
      : 'this year';
  return { start: start.getTime(), end, days, label };
}

type Tone = 'brand' | 'info' | 'success' | 'warning' | 'danger';

export default function Dashboard() {
  const { data, loading, error, fetching, refetch, dataUpdatedAt } = useWorkItems({ top: 2000 });
  const [rangeRaw, setRangeRaw] = useUrlParam('range', 'week');
  const range = (RANGE_OPTIONS.find((o) => o.value === rangeRaw)?.value ?? 'week') as RangeKey;
  const setRange = (k: RangeKey) => setRangeRaw(k);
  const bounds = useMemo(() => rangeBounds(range), [range]);

  // Items "in scope" for the selected period: created, changed, or closed
  // within the window. "All Time" skips the filter.
  const scoped = useMemo(() => {
    if (bounds.start === null) return data;
    const inWindow = (raw?: string | null) => {
      if (!raw) return false;
      const t = new Date(raw).getTime();
      return Number.isFinite(t) && t >= bounds.start! && t <= bounds.end;
    };
    return data.filter(
      (w) =>
        inWindow(w.changedDate) ||
        inWindow(w.createdDate) ||
        inWindow(w.closedDate)
    );
  }, [data, bounds]);

  const stats = useMemo(() => {
    const active = scoped.filter(isActive).length;
    const overdue = scoped.filter(isOverdue).length;
    const highPriBugs = scoped.filter(
      (w) => w.type === 'Bug' && (w.priority === 1 || w.priority === 2) && !isClosed(w)
    ).length;
    const completed = scoped.filter((w) => {
      if (!isClosed(w) || !w.closedDate) return false;
      if (bounds.start === null) return true;
      const t = new Date(w.closedDate).getTime();
      return t >= bounds.start && t <= bounds.end;
    }).length;
    return { active, overdue, highPriBugs, completed };
  }, [scoped, bounds]);

  const trend = useMemo(
    () => trendByDay(scoped, Math.min(bounds.days, 90)),
    [scoped, bounds.days]
  );
  const byState = useMemo(() => countBy(scoped, (w) => w.state), [scoped]);
  const byPriority = useMemo(
    () => countBy(scoped, (w) => (w.priority ? `P${w.priority}` : 'No Priority')),
    [scoped]
  );

  const recent = useMemo(
    () =>
      [...scoped]
        .sort(
          (a, b) =>
            new Date(b.changedDate || 0).getTime() -
            new Date(a.changedDate || 0).getTime()
        )
        .slice(0, 8),
    [scoped]
  );

  const columns: Column<WorkItem>[] = [
    { key: 'id', header: 'ID', accessor: (r) => r.id, width: '70px' },
    {
      key: 'title',
      header: 'Title',
      accessor: (r) => r.title,
      cell: (r) => <span className="font-medium">{r.title}</span>,
    },
    { key: 'type', header: 'Type', accessor: (r) => r.type, cell: (r) => <TypeBadge type={r.type} /> },
    { key: 'state', header: 'State', accessor: (r) => r.state, cell: (r) => <StateBadge state={r.state} /> },
    {
      key: 'priority',
      header: 'Priority',
      accessor: (r) => r.priority,
      cell: (r) => <PriorityBadge priority={r.priority} />,
    },
    {
      key: 'assignee',
      header: 'Assignee',
      accessor: (r) => r.assignedTo,
      cell: (r) => <span className="text-subtle">{r.assignedTo || 'Unassigned'}</span>,
    },
    {
      key: 'updated',
      header: 'Updated',
      accessor: (r) => r.changedDate,
      cell: (r) => <span className="text-xs text-subtle">{formatRelative(r.changedDate)}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Welcome to Global Cloud"
        description="A real-time view of your cloud engineering work."
        action={
          <div className="flex items-center gap-2">
            <DataFreshness updatedAt={dataUpdatedAt} fetching={fetching} onRefresh={refetch} />
            <label className="inline-flex items-center gap-2 h-9 rounded-xl border border-border bg-elevated pl-3 pr-3 text-sm focus-within:ring-2 focus-within:ring-brand/40">
              <CalendarRange size={14} className="text-subtle shrink-0" />
              <Select
                value={range}
                onChange={(e) => setRange(e.target.value as RangeKey)}
                className="h-8 border-0 bg-transparent px-1 pr-6 focus:ring-0"
              >
                {RANGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <>
                <KpiCard
                  label="Active Work Items"
                  value={stats.active}
                  caption={`Touched ${bounds.label}`}
                  tone="brand"
                  variant="bordered"
                  icon={Activity}
                />
                <KpiCard
                  label="Overdue"
                  value={stats.overdue}
                  caption="Past due date"
                  tone="danger"
                  variant="bordered"
                  icon={AlertTriangle}
                />
                <KpiCard
                  label="High-Priority Bugs"
                  value={stats.highPriBugs}
                  caption="P1 / P2 open bugs"
                  tone="warning"
                  variant="bordered"
                  icon={Bug}
                />
                <KpiCard
                  label="Completed"
                  value={stats.completed}
                  caption={`Closed ${bounds.label}`}
                  tone="success"
                  variant="bordered"
                  icon={CheckCircle2}
                />
              </>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ChartContainer
                title={`Activity (${bounds.label})`}
                description="Created vs completed work items per day"
                action={
                  <span className="inline-flex items-center gap-1 text-xs text-subtle">
                    <TrendingUp size={12} /> trend
                  </span>
                }
              >
                <LineChart data={trend} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                  <XAxis dataKey="date" stroke="rgb(var(--subtle))" fontSize={11} />
                  <YAxis stroke="rgb(var(--subtle))" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgb(var(--elevated))',
                      border: '1px solid rgb(var(--border))',
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="created"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </div>

            <ChartContainer title="By Priority" description="Distribution across priorities">
              <PieChart>
                <Tooltip
                  contentStyle={{
                    background: 'rgb(var(--elevated))',
                    border: '1px solid rgb(var(--border))',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Pie
                  data={byPriority}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  label={(p: { value?: number; percent?: number }) =>
                    (p.percent ?? 0) > 0.03 ? String(p.value ?? '') : ''
                  }
                  labelLine={false}
                >
                {byPriority.map((entry, i) => (
                  <Cell key={i} fill={priorityColor(entry.name)} />
                ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ChartContainer>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartContainer title="By State" description="Current state breakdown">
              <BarChart data={byState} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                <XAxis dataKey="name" stroke="rgb(var(--subtle))" fontSize={11} />
                <YAxis stroke="rgb(var(--subtle))" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: 'rgb(var(--elevated))',
                    border: '1px solid rgb(var(--border))',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {byState.map((entry, i) => (
                    <Cell key={i} fill={stateColor(entry.name)} />
                  ))}
                  <LabelList dataKey="value" position="top" className="fill-fg" fontSize={11} />
                </Bar>
              </BarChart>
            </ChartContainer>

            <div className="lg:col-span-2">
              <Card>
                <CardHeader title="Recently updated" description="Last 8 changed work items" />
                <CardBody className="p-0">
                  {!loading && recent.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <DataTable
                      data={recent}
                      columns={columns}
                      rowKey={(r) => r.id}
                      pageSize={8}
                    />
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        </>
      )}
    </>
  );
}
