import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, RefreshCw, Search } from '../components/icons';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Input, Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge, PriorityBadge, StateBadge, TypeBadge } from '../components/ui/Badge';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';
import { useWorkItems } from '../hooks/useWorkItems';
import { useDebounce } from '../hooks/useDebounce';
import { formatRelative } from '../lib/utils';
import type { WorkItem } from '../api/types';

const TYPES = ['', 'Bug', 'Task', 'User Story', 'Feature', 'Epic'];
const STATES = ['', 'New', 'Active', 'In Progress', 'Resolved', 'Closed', 'Done', 'Removed'];

export default function WorkItems() {
  const [params] = useSearchParams();
  const initialQ = params.get('q') ?? '';

  const [type, setType] = useState('');
  const [state, setState] = useState('');
  const [assignee, setAssignee] = useState('');
  const [tags, setTags] = useState('');
  const [q, setQ] = useState(initialQ);
  const debouncedQ = useDebounce(q, 250);

  useEffect(() => setQ(initialQ), [initialQ]);

  const filters = useMemo(
    () => ({
      type: type || undefined,
      state: state || undefined,
      assigned_to: assignee || undefined,
      tags: tags || undefined,
      top: 200,
    }),
    [type, state, assignee, tags]
  );

  const { data, loading, error, refetch } = useWorkItems(filters);

  const filtered = useMemo(() => {
    if (!debouncedQ.trim()) return data;
    const needle = debouncedQ.toLowerCase();
    return data.filter(
      (w) =>
        String(w.id).includes(needle) ||
        w.title.toLowerCase().includes(needle) ||
        (w.assignedTo || '').toLowerCase().includes(needle) ||
        w.tags.some((t) => t.toLowerCase().includes(needle))
    );
  }, [data, debouncedQ]);

  const columns: Column<WorkItem>[] = [
    { key: 'id', header: 'ID', accessor: (r) => r.id, sortable: true, width: '80px' },
    {
      key: 'title',
      header: 'Title',
      accessor: (r) => r.title,
      sortable: true,
      cell: (r) => (
        <div className="flex flex-col">
          <span className="font-medium">{r.title}</span>
          {r.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {r.tags.slice(0, 4).map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </div>
          )}
        </div>
      ),
    },
    { key: 'type', header: 'Type', accessor: (r) => r.type, sortable: true, cell: (r) => <TypeBadge type={r.type} /> },
    { key: 'state', header: 'State', accessor: (r) => r.state, sortable: true, cell: (r) => <StateBadge state={r.state} /> },
    {
      key: 'priority',
      header: 'Priority',
      accessor: (r) => r.priority,
      sortable: true,
      cell: (r) => <PriorityBadge priority={r.priority} />,
    },
    {
      key: 'assignee',
      header: 'Assignee',
      accessor: (r) => r.assignedTo,
      sortable: true,
      cell: (r) => (
        <span className="text-subtle">{r.assignedTo || 'Unassigned'}</span>
      ),
    },
    {
      key: 'updated',
      header: 'Updated',
      accessor: (r) => r.changedDate,
      sortable: true,
      cell: (r) => (
        <span className="text-xs text-subtle">{formatRelative(r.changedDate)}</span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Work Items"
        description="Browse, filter, and search Azure DevOps work items."
        action={
          <Button variant="outline" leftIcon={<RefreshCw size={14} />} onClick={refetch}>
            Refresh
          </Button>
        }
      />

      <Card className="mb-4">
        <CardHeader
          title={
            <span className="inline-flex items-center gap-2">
              <Filter size={14} /> Filters
            </span>
          }
        />
        <CardBody>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
            <Input
              leftIcon={<Search size={14} />}
              placeholder="Search title, ID, tag, assignee…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t || 'All types'}
                </option>
              ))}
            </Select>
            <Select value={state} onChange={(e) => setState(e.target.value)}>
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s || 'All states'}
                </option>
              ))}
            </Select>
            <Input
              placeholder="Assignee (display name)"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
            />
            <Input
              placeholder="Tag contains…"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Results"
          description={
            loading
              ? 'Loading…'
              : `${filtered.length} item${filtered.length === 1 ? '' : 's'}`
          }
        />
        <CardBody className="p-0">
          {error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : loading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : (
            <DataTable
              data={filtered}
              columns={columns}
              rowKey={(r) => r.id}
              pageSize={15}
              defaultSort={{ key: 'assignee', dir: 'asc' }}
            />
          )}
        </CardBody>
      </Card>
    </>
  );
}
