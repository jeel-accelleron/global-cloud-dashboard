import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Trophy, Users } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { ChartContainer } from '../components/ui/ChartContainer';
import { ErrorState } from '../components/ui/ErrorState';
import { SkeletonCard } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { useWorkItems } from '../hooks/useWorkItems';
import { leaderboard } from '../lib/selectors';
import { initials } from '../lib/utils';

export default function TeamInsights() {
  const { data, loading, error, refetch } = useWorkItems({ top: 200 });

  const board = useMemo(() => leaderboard(data), [data]);
  const topAssigned = board.slice(0, 10);
  const topCompleted = [...board].sort((a, b) => b.completed - a.completed).slice(0, 10);

  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Team Insights"
        description="See how work is distributed and who's shipping."
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartContainer
              title={
                <span className="inline-flex items-center gap-2">
                  <Users size={14} /> Workload by assignee
                </span>
              }
              description="Top 10 by total assigned"
            >
              <BarChart
                data={topAssigned}
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
                  width={140}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgb(var(--elevated))',
                    border: '1px solid rgb(var(--border))',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="assigned" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]}>
                  {topAssigned.map((_, i) => (
                    <Cell key={i} fill="#6366f1" />
                  ))}
                  <LabelList dataKey="assigned" position="insideRight" className="fill-white" fontSize={11} />
                </Bar>
                <Bar dataKey="overdue" stackId="b" fill="#ef4444" radius={[0, 8, 8, 0]}>
                  <LabelList dataKey="overdue" position="right" className="fill-fg" fontSize={11} formatter={(v: number) => (v > 0 ? v : '')} />
                </Bar>
              </BarChart>
            </ChartContainer>

            <Card>
              <CardHeader
                title={
                  <span className="inline-flex items-center gap-2">
                    <Trophy size={14} /> Leaderboard
                  </span>
                }
                description="Most completed work items"
              />
              <CardBody className="p-0">
                <ul className="divide-y divide-border">
                  {topCompleted.map((p, idx) => (
                    <li
                      key={p.name}
                      className="flex items-center gap-3 px-5 py-3"
                    >
                      <div className="w-6 text-center text-xs font-semibold text-subtle">
                        {idx + 1}
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                        {initials(p.name)}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{p.name}</div>
                        <div className="text-[11px] text-subtle">
                          {p.assigned} assigned · {p.overdue} overdue
                        </div>
                      </div>
                      <Badge tone="success">{p.completed} done</Badge>
                    </li>
                  ))}
                  {topCompleted.length === 0 && (
                    <li className="px-5 py-6 text-center text-sm text-subtle">
                      No data yet
                    </li>
                  )}
                </ul>
              </CardBody>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader title="All contributors" description="Full breakdown" />
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-subtle">
                      <th className="px-4 py-2.5 font-medium">Person</th>
                      <th className="px-4 py-2.5 font-medium">Assigned</th>
                      <th className="px-4 py-2.5 font-medium">Completed</th>
                      <th className="px-4 py-2.5 font-medium">Overdue</th>
                      <th className="px-4 py-2.5 font-medium">Completion %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {board.map((p) => {
                      const pct =
                        p.assigned === 0
                          ? 0
                          : Math.round((p.completed / p.assigned) * 100);
                      return (
                        <tr key={p.name} className="border-b border-border last:border-0">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/10 text-[11px] font-semibold text-brand">
                                {initials(p.name)}
                              </div>
                              <span className="font-medium">{p.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">{p.assigned}</td>
                          <td className="px-4 py-3 text-success">{p.completed}</td>
                          <td className="px-4 py-3 text-danger">{p.overdue}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full bg-success"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-subtle">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </>
  );
}
