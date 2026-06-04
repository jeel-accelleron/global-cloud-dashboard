import { useEffect, useMemo, useState } from 'react';
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
import { CalendarRange, Trophy, Users } from '../components/icons';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { ChartContainer } from '../components/ui/ChartContainer';
import { ErrorState } from '../components/ui/ErrorState';
import { SkeletonCard } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Input';
import { useWorkItems } from '../hooks/useWorkItems';
import { leaderboard } from '../lib/selectors';
import { initials } from '../lib/utils';
import { getTeam, type TeamInfo, type TeamMember } from '../api/workItems';

type RangeKey = 'week' | 'month' | 'quarter' | 'half' | 'year' | 'all';

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'half', label: 'This Half' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

function rangeBounds(key: RangeKey): {
  start: number | null;
  end: number;
  label: string;
} {
  const now = new Date();
  const end = now.getTime();
  if (key === 'all') return { start: null, end, label: 'all time' };
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (key === 'week') {
    const dow = (start.getDay() + 6) % 7; // Monday-anchored
    start.setDate(start.getDate() - dow);
  } else if (key === 'month') {
    start.setDate(1);
  } else if (key === 'quarter') {
    start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
  } else if (key === 'half') {
    start.setMonth(start.getMonth() < 6 ? 0 : 6, 1);
  } else if (key === 'year') {
    start.setMonth(0, 1);
  }
  const label =
    key === 'week'
      ? 'this week'
      : key === 'month'
      ? 'this month'
      : key === 'quarter'
      ? 'this quarter'
      : key === 'half'
      ? 'this half'
      : 'this year';
  return { start: start.getTime(), end, label };
}

function PersonChip({ person }: { person: TeamMember }) {
  const name = person.displayName || person.uniqueName || 'Unknown';
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-border bg-elevated px-2.5 py-1 text-xs"
      title={person.uniqueName ?? undefined}
    >
      {person.imageUrl ? (
        // ADO image URLs require auth from the same browser session as DevOps;
        // fall back to initials if the image can’t load.
        <img
          src={person.imageUrl}
          alt=""
          className="h-5 w-5 rounded-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/10 text-[10px] font-semibold text-brand">
          {initials(name)}
        </span>
      )}
      <span className="font-medium">{name}</span>
    </div>
  );
}

function TeamOverview({
  info,
  loading,
  error,
}: {
  info: TeamInfo | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) return <div className="mb-4"><SkeletonCard /></div>;
  if (error) {
    return (
      <Card className="mb-4">
        <CardBody className="text-sm text-danger">{error}</CardBody>
      </Card>
    );
  }
  if (!info) return null;
  const teamName = info.team?.name || info.project.name;
  const description = info.team?.description || info.project.description;
  return (
    <Card className="mb-4">
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Users size={16} /> {teamName}
          </span>
        }
        description={description || `Team in ${info.project.name}`}
      />
      <CardBody className="space-y-4">
        <div>
          <div className="mb-2 text-xs uppercase tracking-wide text-subtle">
            Admins ({info.admins.length})
          </div>
          {info.admins.length === 0 ? (
            <div className="text-xs text-subtle">No admins listed.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {info.admins.map((p) => (
                <PersonChip key={p.uniqueName ?? p.displayName ?? Math.random()} person={p} />
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="mb-2 text-xs uppercase tracking-wide text-subtle">
            Members ({info.members.length})
          </div>
          {info.members.length === 0 ? (
            <div className="text-xs text-subtle">No members listed.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {info.members.map((p) => (
                <PersonChip key={p.uniqueName ?? p.displayName ?? Math.random()} person={p} />
              ))}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

export default function TeamInsights() {
  const { data, loading, error, refetch } = useWorkItems({ top: 2000 });
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [teamLoading, setTeamLoading] = useState(true);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>('month');
  const bounds = useMemo(() => rangeBounds(range), [range]);

  useEffect(() => {
    let cancelled = false;
    setTeamLoading(true);
    setTeamError(null);
    getTeam()
      .then((info) => {
        if (!cancelled) setTeam(info);
      })
      .catch((e) => {
        if (!cancelled) setTeamError(e?.message || 'Failed to load team info');
      })
      .finally(() => {
        if (!cancelled) setTeamLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const board = useMemo(() => leaderboard(scoped), [scoped]);
  const topAssigned = board.slice(0, 10);
  const topCompleted = [...board].sort((a, b) => b.completed - a.completed).slice(0, 10);

  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Team Insights"
        description="See how work is distributed and who's shipping."
        action={
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
        }
      />

      <TeamOverview info={team} loading={teamLoading} error={teamError} />

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
              description={`Top 10 by total assigned (${bounds.label})`}
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
                description={`Most completed work items (${bounds.label})`}
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
            <CardHeader title="All contributors" description={`Full breakdown (${bounds.label})`} />
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
