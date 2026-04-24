import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
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
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody } from '../components/ui/Card';
import { ChartContainer } from '../components/ui/ChartContainer';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { StateBadge, TypeBadge, PriorityBadge } from '../components/ui/Badge';
import { getWorkItemHierarchy, type HierarchyNode } from '../api/hierarchy';
import type { WorkItem } from '../api/types';
import { cn } from '../lib/utils';

const TYPE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#a855f7', '#ef4444', '#14b8a6'];
const STATE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#94a3b8', '#a855f7', '#ef4444'];
const PRIORITY_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#94a3b8', '#cbd5e1'];
const ASSIGNEE_COLOR = '#6366f1';

const TOOLTIP_STYLE = {
  background: 'rgb(var(--elevated))',
  border: '1px solid rgb(var(--border))',
  borderRadius: 12,
  fontSize: 12,
} as const;

function flattenDescendants(node: HierarchyNode): WorkItem[] {
  const out: WorkItem[] = [];
  for (const c of node.children) {
    out.push(c.item);
    out.push(...flattenDescendants(c));
  }
  return out;
}

function tally<T extends string | number>(
  items: WorkItem[],
  key: (w: WorkItem) => T | null | undefined,
  fallback: T
): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    const name = String(k ?? fallback);
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function fmtDate(s?: string | null): string {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function countDescendants(node: HierarchyNode): number {
  let n = 0;
  for (const c of node.children) n += 1 + countDescendants(c);
  return n;
}

function HierarchyRow({
  node,
  depth,
  expandAll,
}: {
  node: HierarchyNode;
  depth: number;
  expandAll: boolean;
}) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    setOpen(expandAll);
  }, [expandAll]);

  const hasChildren = node.children.length > 0;
  const it = node.item;
  const adoUrl = it.raw.url
    ? it.raw.url.replace('/_apis/wit/workItems/', '/_workitems/edit/')
    : null;

  return (
    <div>
      <div
        className={cn(
          'group flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50',
          depth === 0 && 'bg-muted/30'
        )}
        style={{ paddingLeft: 8 + depth * 18 }}
      >
        <button
          onClick={() => hasChildren && setOpen((v) => !v)}
          className={cn(
            'mt-0.5 shrink-0 rounded p-0.5 text-subtle',
            hasChildren ? 'hover:bg-muted hover:text-fg' : 'invisible'
          )}
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={it.type} />
            <span className="text-xs font-mono text-subtle">#{it.id}</span>
            <span className="truncate text-sm font-medium text-fg" title={it.title}>
              {it.title}
            </span>
            {adoUrl && (
              <a
                href={adoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-subtle opacity-0 transition-opacity hover:text-brand group-hover:opacity-100"
                title="Open in Azure DevOps"
              >
                <ExternalLink size={12} />
              </a>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-subtle">
            <StateBadge state={it.state} />
            {it.priority != null && <PriorityBadge priority={it.priority} />}
            <span>
              <span className="text-subtle/70">Assignee:</span>{' '}
              <span className="text-fg">{it.assignedTo || 'Unassigned'}</span>
            </span>
            {(it.startDate || it.targetDate || it.dueDate) && (
              <span>
                <span className="text-subtle/70">Schedule:</span>{' '}
                {fmtDate(it.startDate)} → {fmtDate(it.targetDate ?? it.dueDate)}
              </span>
            )}
            {hasChildren && (
              <span>
                <span className="text-subtle/70">Children:</span>{' '}
                <span className="text-fg">{node.children.length}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {hasChildren && open && (
        <div className="border-l border-border" style={{ marginLeft: 16 + depth * 18 }}>
          {node.children.map((c) => (
            <HierarchyRow key={c.item.id} node={c} depth={depth + 1} expandAll={expandAll} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectSummary({ item, totalDescendants }: { item: WorkItem; totalDescendants: number }) {
  const adoUrl = item.raw.url
    ? item.raw.url.replace('/_apis/wit/workItems/', '/_workitems/edit/')
    : null;
  return (
    <Card>
      <CardBody>
        <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-3 lg:grid-cols-5">
          <div>
            <div className="text-subtle/70">Type</div>
            <div className="mt-1"><TypeBadge type={item.type} /></div>
          </div>
          <div>
            <div className="text-subtle/70">State</div>
            <div className="mt-1"><StateBadge state={item.state} /></div>
          </div>
          <div>
            <div className="text-subtle/70">Assignee</div>
            <div className="mt-1 truncate text-fg" title={item.assignedTo ?? ''}>
              {item.assignedTo || 'Unassigned'}
            </div>
          </div>
          <div>
            <div className="text-subtle/70">Start → Finish</div>
            <div className="mt-1 text-fg">
              {fmtDate(item.startDate)} → {fmtDate(item.targetDate ?? item.dueDate)}
            </div>
          </div>
          <div>
            <div className="text-subtle/70">Total descendants</div>
            <div className="mt-1 text-fg">{totalDescendants}</div>
          </div>
          <div className="col-span-2 sm:col-span-3 lg:col-span-5">
            <div className="text-subtle/70">Iteration</div>
            <div className="mt-1 truncate text-fg" title={item.iterationPath ?? ''}>
              {item.iterationPath || '—'}
            </div>
          </div>
        </div>
        {adoUrl && (
          <div className="mt-4 border-t border-border pt-3">
            <a
              href={adoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
            >
              <ExternalLink size={12} /> Open in Azure DevOps
            </a>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const workItemId = id ? parseInt(id, 10) : NaN;

  const [tree, setTree] = useState<HierarchyNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandAll, setExpandAll] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(workItemId)) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setTree(null);
    getWorkItemHierarchy(workItemId, 5)
      .then((t) => {
        if (!cancelled) setTree(t);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Failed to load hierarchy');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workItemId]);

  const totalDescendants = useMemo(() => (tree ? countDescendants(tree) : 0), [tree]);

  const descendants = useMemo(() => (tree ? flattenDescendants(tree) : []), [tree]);

  const byAssignee = useMemo(
    () => {
      const top = tally(descendants, (w) => w.assignedTo, 'Unassigned').slice(0, 10);
      const total = descendants.length || 1;
      return top.map((d) => {
        const pct = Math.round((d.value / total) * 100);
        return { ...d, pct, label: `${d.value} (${pct}%)` };
      });
    },
    [descendants]
  );
  const byType = useMemo(() => tally(descendants, (w) => w.type, 'Unknown'), [descendants]);
  const byState = useMemo(() => tally(descendants, (w) => w.state, 'Unknown'), [descendants]);
  const byPriority = useMemo(
    () =>
      tally(descendants, (w) => (w.priority != null ? `P${w.priority}` : null), 'Unset').sort(
        (a, b) => a.name.localeCompare(b.name)
      ),
    [descendants]
  );

  return (
    <>
      <PageHeader
        title={tree ? `#${tree.item.id} ${tree.item.title}` : `Project #${id}`}
        description={tree ? `${tree.item.type} · ${tree.item.state}` : 'Loading project details…'}
        action={
          <Button variant="outline" onClick={() => navigate('/projects')}>
            <ArrowLeft size={14} /> Back to Projects
          </Button>
        }
      />

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      )}

      {error && <ErrorState message={error} onRetry={() => navigate(0)} />}

      {tree && !loading && !error && (
        <div className="space-y-4">
          <ProjectSummary item={tree.item} totalDescendants={totalDescendants} />

          {descendants.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ChartContainer
                  title="Responsibility by Assignee"
                  description={`Top ${byAssignee.length} contributors across ${descendants.length} descendant work items`}
                >
                  <BarChart
                    data={byAssignee}
                    layout="vertical"
                    margin={{ top: 10, right: 16, left: 8, bottom: 0 }}
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
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgb(var(--muted))' }} />
                    <Bar dataKey="value" fill={ASSIGNEE_COLOR} radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="label" position="right" className="fill-fg" fontSize={11} />
                    </Bar>
                  </BarChart>
                </ChartContainer>

                <ChartContainer
                  title="Work Item Type Distribution"
                  description="Breakdown of descendant types"
                >
                  <PieChart>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Pie
                      data={byType}
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
                      {byType.map((_, i) => (
                        <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ChartContainer>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ChartContainer title="By State" description="Current state breakdown">
                  <BarChart data={byState} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                    <XAxis dataKey="name" stroke="rgb(var(--subtle))" fontSize={11} />
                    <YAxis stroke="rgb(var(--subtle))" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgb(var(--muted))' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {byState.map((_, i) => (
                        <Cell key={i} fill={STATE_COLORS[i % STATE_COLORS.length]} />
                      ))}
                      <LabelList dataKey="value" position="top" className="fill-fg" fontSize={11} />
                    </Bar>
                  </BarChart>
                </ChartContainer>

                <ChartContainer title="By Priority" description="Priority distribution">
                  <PieChart>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
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
            </>
          )}

          <Card>
            <CardBody>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-fg">Hierarchy</h3>
                <Button variant="outline" onClick={() => setExpandAll((v) => !v)}>
                  {expandAll ? 'Collapse all' : 'Expand all'}
                </Button>
              </div>
              {tree.children.length === 0 ? (
                <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-xs text-subtle">
                  No child work items linked to this Feature.
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-surface p-1">
                  {tree.children.map((c) => (
                    <HierarchyRow key={c.item.id} node={c} depth={0} expandAll={expandAll} />
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
}
