import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ListTodo,
  User2,
} from '../components/icons';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { DataTable, type Column } from '../components/ui/DataTable';
import { KpiCard } from '../components/ui/KpiCard';
import { PriorityBadge, StateBadge, TypeBadge } from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { DataFreshness } from '../components/ui/DataFreshness';
import { useWorkItems } from '../hooks/useWorkItems';
import { useCurrentUser } from '../lib/me';
import { isActive, isClosed, isOverdue } from '../lib/selectors';
import type { WorkItem } from '../api/types';
import { formatRelative } from '../lib/utils';

export default function MyWork() {
  const [me] = useCurrentUser();
  const { data, loading, error, fetching, refetch, dataUpdatedAt } =
    useWorkItems({ top: 2000 });

  const mine = useMemo(() => {
    if (!me) return [] as WorkItem[];
    const lower = me.toLowerCase();
    return data.filter((w) => (w.assignedTo ?? '').toLowerCase() === lower);
  }, [data, me]);

  const stats = useMemo(() => {
    const open = mine.filter((w) => !isClosed(w));
    return {
      active: open.filter(isActive).length,
      overdue: open.filter(isOverdue).length,
      open: open.length,
      done: mine.filter(isClosed).length,
    };
  }, [mine]);

  const sorted = useMemo(() => {
    const score = (w: WorkItem) => {
      if (isOverdue(w)) return 0;
      const p = w.priority ?? 9;
      return p;
    };
    return [...mine]
      .filter((w) => !isClosed(w))
      .sort((a, b) => {
        const s = score(a) - score(b);
        if (s !== 0) return s;
        const ad = new Date(a.changedDate || 0).getTime();
        const bd = new Date(b.changedDate || 0).getTime();
        return bd - ad;
      });
  }, [mine]);

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
      key: 'due',
      header: 'Due',
      accessor: (r) => r.dueDate ?? r.targetDate ?? r.finishDate,
      cell: (r) => {
        const due = r.dueDate ?? r.targetDate ?? r.finishDate;
        if (!due) return <span className="text-xs text-subtle">—</span>;
        return (
          <span className={isOverdue(r) ? 'text-xs font-medium text-danger' : 'text-xs text-subtle'}>
            {formatRelative(due)}
          </span>
        );
      },
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
        title="My Work"
        description={
          me
            ? `Open items assigned to ${me}, ranked by priority and due date.`
            : 'Pick yourself from the avatar menu to see items assigned to you.'
        }
        action={
          <DataFreshness
            updatedAt={dataUpdatedAt}
            fetching={fetching}
            onRefresh={refetch}
          />
        }
      />

      {!me ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<User2 size={22} />}
              title="No identity selected"
              description="Click your avatar in the top right and pick your name. We'll show only the work assigned to you."
            />
          </CardBody>
        </Card>
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <>
                <KpiCard label="Open" value={stats.open} icon={ListTodo} tone="brand" />
                <KpiCard label="Active" value={stats.active} icon={Activity} tone="info" />
                <KpiCard label="Overdue" value={stats.overdue} icon={AlertTriangle} tone="danger" />
                <KpiCard label="Completed" value={stats.done} icon={CheckCircle2} tone="success" />
              </>
            )}
          </div>

          <Card>
            <CardHeader
              title="My open work"
              description="Highest priority and overdue items first."
            />
            <CardBody className="pt-0">
              {loading ? (
                <SkeletonCard />
              ) : sorted.length === 0 ? (
                <EmptyState
                  title="Inbox zero"
                  description="You have no open items right now. Nice work."
                  action={
                    <Link
                      to="/work-items"
                      className="text-xs font-medium text-brand hover:underline"
                    >
                      Browse all work items →
                    </Link>
                  }
                />
              ) : (
                <DataTable data={sorted} columns={columns} rowKey={(r) => r.id} pageSize={15} />
              )}
            </CardBody>
          </Card>
        </>
      )}
    </>
  );
}
