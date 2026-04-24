import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CalendarRange,
  CheckCircle2,
  FolderKanban,
  PlayCircle,
  Users,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { ChartContainer } from '../components/ui/ChartContainer';
import { KpiCard } from '../components/ui/KpiCard';
import { Select } from '../components/ui/Input';
import { ErrorState } from '../components/ui/ErrorState';
import { SkeletonCard } from '../components/ui/Skeleton';
import { GanttChart } from '../components/projects/GanttChart';
import { useWorkItems } from '../hooks/useWorkItems';
import { countBy, isActive, isClosed } from '../lib/selectors';

const STATE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#94a3b8', '#a855f7'];
const ASSIGN_COLOR = '#6366f1';

function extractYear(iterationPath?: string | null): number | null {
  if (!iterationPath) return null;
  const m = iterationPath.match(/(20\d{2})/);
  return m ? parseInt(m[1], 10) : null;
}

export default function Projects() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);

  // Pull all Features once (we do client-side year filtering)
  const { data, loading, error, refetch } = useWorkItems({
    type: 'Feature',
    top: 200,
  });

  const yearsAvailable = useMemo(() => {
    const set = new Set<number>();
    set.add(currentYear);
    for (const it of data) {
      const y = extractYear(it.iterationPath);
      if (y) set.add(y);
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [data, currentYear]);

  const projects = useMemo(
    () => data.filter((it) => extractYear(it.iterationPath) === year),
    [data, year]
  );

  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter(isActive).length;
    const completed = projects.filter(isClosed).length;
    const owners = new Set(projects.map((p) => p.assignedTo).filter(Boolean));
    return { total, active, completed, owners: owners.size };
  }, [projects]);

  const byAssignee = useMemo(
    () =>
      countBy(projects, (p) => p.assignedTo || 'Unassigned')
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [projects]
  );
  const byStatus = useMemo(() => countBy(projects, (p) => p.state), [projects]);

  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Projects"
        description="Feature work items grouped by iteration year."
        action={
          <div className="flex items-center gap-2">
            <CalendarRange size={14} className="text-subtle" />
            <Select
              value={String(year)}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
            >
              {yearsAvailable.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Total Projects"
              value={stats.total}
              icon={FolderKanban}
              tone="brand"
            />
            <KpiCard
              label="Active"
              value={stats.active}
              icon={PlayCircle}
              tone="info"
            />
            <KpiCard
              label="Completed"
              value={stats.completed}
              icon={CheckCircle2}
              tone="success"
            />
            <KpiCard
              label="Owners"
              value={stats.owners}
              icon={Users}
              tone="warning"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartContainer
              title="Projects by Assignee"
              description={`Top 10 owners in ${year}`}
            >
              <BarChart
                data={byAssignee}
                layout="vertical"
                margin={{ top: 10, right: 16, left: 16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                <XAxis type="number" stroke="rgb(var(--subtle))" fontSize={11} allowDecimals={false} />
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
                <Bar dataKey="value" radius={[0, 8, 8, 0]} fill={ASSIGN_COLOR}>
                  <LabelList dataKey="value" position="right" className="fill-fg" fontSize={11} />
                </Bar>
              </BarChart>
            </ChartContainer>

            <ChartContainer title="Projects by Status">
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
                  data={byStatus}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  label={(p: { value?: number; percent?: number }) =>
                    (p.percent ?? 0) > 0.03 ? String(p.value ?? '') : ''
                  }
                  labelLine={false}
                >
                  {byStatus.map((_, i) => (
                    <Cell key={i} fill={STATE_COLORS[i % STATE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ChartContainer>
          </div>

          <Card className="mt-6">
            <CardHeader
              title="Project Timeline"
              description={`Gantt view of ${year} projects (Start → Finish/Target dates). Today is highlighted in red.`}
            />
            <CardBody className="p-0">
              <GanttChart items={projects} year={year} onSelect={(it) => navigate(`/projects/${it.id}`)} />
            </CardBody>
          </Card>
        </>
      )}
    </>
  );
}
