import { useMemo } from 'react';
import {
  Area,
  AreaChart,
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
import { ErrorState } from '../components/ui/ErrorState';
import { SkeletonCard } from '../components/ui/Skeleton';
import { useWorkItems } from '../hooks/useWorkItems';
import { countBy, trendByDay } from '../lib/selectors';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#94a3b8'];

export default function Analytics() {
  const { data, loading, error, refetch } = useWorkItems({ top: 200 });

  const trend = useMemo(() => trendByDay(data, 30), [data]);
  const byType = useMemo(() => countBy(data, (w) => w.type), [data]);
  const byState = useMemo(() => countBy(data, (w) => w.state), [data]);
  const byArea = useMemo(
    () =>
      countBy(data, (w) =>
        w.areaPath ? w.areaPath.split('\\').pop() || w.areaPath : 'Unassigned'
      )
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    [data]
  );

  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Trends, throughput and distribution across your work."
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartContainer title="Throughput" description="Created vs completed (30d)">
            <AreaChart data={trend} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
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
              <Area
                type="monotone"
                dataKey="created"
                stroke="#6366f1"
                fill="url(#g1)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="completed"
                stroke="#10b981"
                fill="url(#g2)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>

          <ChartContainer title="Cumulative completed" description="Last 30 days">
            <LineChart
              data={trend.reduce<{ date: string; total: number }[]>((acc, cur) => {
                const prev = acc[acc.length - 1]?.total ?? 0;
                acc.push({ date: cur.date, total: prev + cur.completed });
                return acc;
              }, [])}
              margin={{ top: 10, right: 16, left: -8, bottom: 0 }}
            >
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
              <Line
                type="monotone"
                dataKey="total"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>

          <ChartContainer title="Items by type">
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
                data={byType}
                dataKey="value"
                nameKey="name"
                outerRadius={90}
                innerRadius={50}
                paddingAngle={2}
                label={(p: { value?: number; percent?: number }) =>
                  (p.percent ?? 0) > 0.03 ? String(p.value ?? '') : ''
                }
                labelLine={false}
              >
                {byType.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ChartContainer>

          <ChartContainer title="Top areas" description="Most active area paths">
            <BarChart
              data={byArea}
              layout="vertical"
              margin={{ top: 10, right: 16, left: 16, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
              <XAxis type="number" stroke="rgb(var(--subtle))" fontSize={11} />
              <YAxis
                dataKey="name"
                type="category"
                stroke="rgb(var(--subtle))"
                fontSize={11}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgb(var(--elevated))',
                  border: '1px solid rgb(var(--border))',
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} fill="#6366f1">
                <LabelList dataKey="value" position="right" className="fill-fg" fontSize={11} />
              </Bar>
            </BarChart>
          </ChartContainer>

          <div className="lg:col-span-2">
            <ChartContainer title="State distribution" description="Where your work currently lives">
              <BarChart data={byState} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
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
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                  <LabelList dataKey="value" position="top" className="fill-fg" fontSize={11} />
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      )}
    </>
  );
}
