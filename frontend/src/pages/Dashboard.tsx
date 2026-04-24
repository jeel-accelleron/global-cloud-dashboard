import { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  Bug,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
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
import { KpiCard } from '../components/ui/KpiCard';
import { ChartContainer } from '../components/ui/ChartContainer';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { DataTable, type Column } from '../components/ui/DataTable';
import { PriorityBadge, StateBadge, TypeBadge } from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { useWorkItems } from '../hooks/useWorkItems';
import { countBy, isActive, isClosed, isOverdue, trendByDay } from '../lib/selectors';
import type { WorkItem } from '../api/types';
import { formatRelative } from '../lib/utils';

const PRIORITY_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#94a3b8', '#cbd5e1'];
const STATE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#94a3b8', '#a855f7'];

export default function Dashboard() {
  const { data, loading, error, refetch } = useWorkItems({ top: 200 });

  const stats = useMemo(() => {
    const active = data.filter(isActive).length;
    const overdue = data.filter(isOverdue).length;
    const highPriBugs = data.filter(
      (w) => w.type === 'Bug' && (w.priority === 1 || w.priority === 2) && !isClosed(w)
    ).length;
    const completed30 = data.filter((w) => {
      if (!isClosed(w) || !w.closedDate) return false;
      const t = new Date(w.closedDate).getTime();
      return Date.now() - t <= 30 * 86400000;
    }).length;
    return { active, overdue, highPriBugs, completed30 };
  }, [data]);

  const trend = useMemo(() => trendByDay(data, 30), [data]);
  const byState = useMemo(() => countBy(data, (w) => w.state), [data]);
  const byPriority = useMemo(
    () => countBy(data, (w) => (w.priority ? `P${w.priority}` : 'No Priority')),
    [data]
  );

  const recent = useMemo(
    () =>
      [...data]
        .sort(
          (a, b) =>
            new Date(b.changedDate || 0).getTime() -
            new Date(a.changedDate || 0).getTime()
        )
        .slice(0, 8),
    [data]
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
        title="Dashboard"
        description="A real-time view of your cloud engineering work."
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
                  icon={Activity}
                  tone="brand"
                />
                <KpiCard
                  label="Overdue"
                  value={stats.overdue}
                  icon={AlertTriangle}
                  tone="danger"
                />
                <KpiCard
                  label="High-Priority Bugs"
                  value={stats.highPriBugs}
                  icon={Bug}
                  tone="warning"
                />
                <KpiCard
                  label="Completed (30d)"
                  value={stats.completed30}
                  icon={CheckCircle2}
                  tone="success"
                />
              </>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ChartContainer
                title="Activity (last 30 days)"
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
                  {byPriority.map((_, i) => (
                    <Cell key={i} fill={PRIORITY_COLORS[i % PRIORITY_COLORS.length]} />
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
                  {byState.map((_, i) => (
                    <Cell key={i} fill={STATE_COLORS[i % STATE_COLORS.length]} />
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
