import { useMemo } from 'react';
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
  Search,
  Users,
  X,
} from '../components/icons';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { ChartContainer } from '../components/ui/ChartContainer';
import { ProjectActivityChart } from '../components/ui/ProjectActivityChart';
import { EmptyState } from '../components/ui/EmptyState';
import { Input, Select } from '../components/ui/Input';
import { ErrorState } from '../components/ui/ErrorState';
import { SkeletonCard } from '../components/ui/Skeleton';
import { KpiCard } from '../components/ui/KpiCard';
import { DataFreshness } from '../components/ui/DataFreshness';
import { GanttChart } from '../components/projects/GanttChart';
import { useWorkItems } from '../hooks/useWorkItems';
import { countBy, isActive, isClosed } from '../lib/selectors';
import { stateColor } from '../lib/colors';
import { useUrlNumber, useUrlParam } from '../lib/urlState';

const ASSIGN_COLOR = '#6366f1';

type Tone = 'brand' | 'info' | 'success' | 'warning' | 'danger';

function extractYear(iterationPath?: string | null): number | null {
  if (!iterationPath) return null;
  const m = iterationPath.match(/(20\d{2})/);
  return m ? parseInt(m[1], 10) : null;
}

function FilterPill({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 h-8 rounded-full border border-brand/30 bg-brand/10 px-3 text-xs font-medium text-brand">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remove filter: ${label}`}
        className="rounded-full p-0.5 hover:bg-brand/20"
      >
        <X size={12} />
      </button>
    </span>
  );
}

export default function Projects() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useUrlNumber('year', currentYear);
  const [search, setSearch] = useUrlParam('q', '');
  const [assigneeRaw, setAssigneeRaw] = useUrlParam('owner', '');
  const [statusRaw, setStatusRaw] = useUrlParam('status', '');
  const assigneeFilter = assigneeRaw || null;
  const statusFilter = statusRaw || null;
  const setAssigneeFilter = (n: string | null) => setAssigneeRaw(n ?? '');
  const setStatusFilter = (n: string | null) => setStatusRaw(n ?? '');

  // Pull all Features once. Bumped from 200 → 2000 so the year selector
  // reflects every available iteration year, not just whatever fit in the
  // first page.
  const { data, loading, error, fetching, refetch, dataUpdatedAt } = useWorkItems({
    type: 'Feature',
    top: 2000,
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

  // Year-scoped feature list. KPIs and the secondary charts are computed
  // from this so they always reflect the whole year, regardless of the
  // active drill-in/search filters.
  const projects = useMemo(
    () => data.filter((it) => extractYear(it.iterationPath) === year),
    [data, year]
  );

  // Filtered list driving the Gantt: search + assignee/status drill-in.
  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (q) {
        const owner = (p.assignedTo || '').toLowerCase();
        const title = (p.title || '').toLowerCase();
        if (!title.includes(q) && !owner.includes(q)) return false;
      }
      if (assigneeFilter) {
        const owner = p.assignedTo || 'Unassigned';
        if (owner !== assigneeFilter) return false;
      }
      if (statusFilter && p.state !== statusFilter) return false;
      return true;
    });
  }, [projects, search, assigneeFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter(isActive).length;
    const completed = projects.filter(isClosed).length;
    // Owners = unique real assignees (drop empty + literal 'Unassigned').
    const owners = new Set(
      projects
        .map((p) => p.assignedTo)
        .filter((a): a is string => !!a && a !== 'Unassigned')
    );
    return { total, active, completed, owners: owners.size };
  }, [projects]);

  const byAssignee = useMemo(
    () =>
      countBy(projects, (p) => p.assignedTo || 'Unassigned')
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
    [projects]
  );
  const byStatus = useMemo(() => countBy(projects, (p) => p.state), [projects]);

  const hasFilters = !!search || !!assigneeFilter || !!statusFilter;
  const clearFilters = () => {
    setSearch('');
    setAssigneeFilter(null);
    setStatusFilter(null);
  };

  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Projects"
        description="Feature work items grouped by iteration year."
        action={
          <div className="flex items-center gap-2">
            <DataFreshness updatedAt={dataUpdatedAt} fetching={fetching} onRefresh={refetch} />
            <label
              className="inline-flex items-center gap-2 h-9 rounded-xl border border-border bg-elevated pl-3 pr-3 text-sm focus-within:ring-2 focus-within:ring-brand/40"
              aria-label="Year"
            >
              <CalendarRange size={14} className="text-subtle shrink-0" />
              <Select
                value={String(year)}
                onChange={(e) => {
                  setYear(parseInt(e.target.value, 10));
                  clearFilters();
                }}
                aria-label="Year"
                className="h-8 border-0 bg-transparent px-1 pr-6 focus:ring-0"
              >
                {yearsAvailable.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </label>
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
              caption="Features"
              tone="brand"
              variant="bordered"
              icon={FolderKanban}
              loading={loading}
            />
            <KpiCard
              label="Active"
              value={stats.active}
              caption="In progress"
              tone="info"
              variant="bordered"
              icon={PlayCircle}
              loading={loading}
            />
            <KpiCard
              label="Completed"
              value={stats.completed}
              caption="Closed / done"
              tone="success"
              variant="bordered"
              icon={CheckCircle2}
              loading={loading}
            />
            <KpiCard
              label="Owners"
              value={stats.owners}
              caption="Unique assignees"
              tone="warning"
              variant="bordered"
              icon={Users}
              loading={loading}
            />
          </div>

          {/* Toolbar: search + active drill-in pills */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Input
              leftIcon={<Search size={14} />}
              placeholder="Search by title or owner…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-80"
              aria-label="Search projects"
            />
            {assigneeFilter && (
              <FilterPill
                label={`Owner: ${assigneeFilter}`}
                onClear={() => setAssigneeFilter(null)}
              />
            )}
            {statusFilter && (
              <FilterPill
                label={`Status: ${statusFilter}`}
                onClear={() => setStatusFilter(null)}
              />
            )}
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="ml-auto text-xs text-subtle underline-offset-2 hover:text-fg hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Project Timeline — promoted above secondary charts */}
          <Card className="mt-4">
            <CardHeader
              title="Project Timeline"
              description={
                hasFilters
                  ? `Showing ${filteredProjects.length} of ${projects.length} projects in ${year}`
                  : `Gantt view of ${year} projects (Start → Finish/Target dates). Today is highlighted in red.`
              }
            />
            <CardBody className="p-0">
              {projects.length === 0 ? (
                <EmptyState
                  title={`No projects in ${year}`}
                  description="Try a different year, or check that Features have an iteration set."
                />
              ) : filteredProjects.length === 0 ? (
                <EmptyState
                  title="No projects match the current filters"
                  description="Adjust the search or clear the active filters above."
                  action={
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-xs font-medium text-brand hover:underline"
                    >
                      Clear filters
                    </button>
                  }
                />
              ) : (
                <GanttChart
                  items={filteredProjects}
                  year={year}
                  onSelect={(it) => navigate(`/projects/${it.id}`)}
                />
              )}
            </CardBody>
          </Card>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartContainer
              title="Projects by Assignee"
              description={`Top 10 owners in ${year} · click a bar to filter`}
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
                <Bar
                  dataKey="value"
                  radius={[0, 8, 8, 0]}
                  fill={ASSIGN_COLOR}
                  cursor="pointer"
                  onClick={(d: any) => {
                    const name = d?.name as string | undefined;
                    if (!name) return;
                    setAssigneeFilter(assigneeFilter === name ? null : name);
                  }}
                >
                  {byAssignee.map((d, i) => (
                    <Cell
                      key={i}
                      fill={
                        assigneeFilter && assigneeFilter !== d.name
                          ? '#94a3b8'
                          : ASSIGN_COLOR
                      }
                    />
                  ))}
                  <LabelList dataKey="value" position="right" className="fill-fg" fontSize={11} />
                </Bar>
              </BarChart>
            </ChartContainer>

            <ChartContainer
              title="Projects by Status"
              description="Click a slice to filter the timeline"
            >
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
                  cursor="pointer"
                  onClick={(d: any) => {
                    const name = d?.name as string | undefined;
                    if (!name) return;
                    setStatusFilter(statusFilter === name ? null : name);
                  }}
                  label={(p: { value?: number; percent?: number }) =>
                    (p.percent ?? 0) > 0.03 ? String(p.value ?? '') : ''
                  }
                  labelLine={false}
                >
                  {byStatus.map((d, i) => (
                    <Cell
                      key={i}
                      fill={stateColor(d.name)}
                      opacity={statusFilter && statusFilter !== d.name ? 0.35 : 1}
                    />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ChartContainer>
          </div>

          {/* Hidden for now — keep mounted-free until we re-enable.
          <div className="mt-6">
            <ProjectActivityChart
              range="year"
              bucket="week"
              topN={Number.POSITIVE_INFINITY}
              title="Project (Feature) activity trends"
              description={`Weekly activity per feature in ${year}`}
            />
          </div>
          */}
        </>
      )}
    </>
  );
}
