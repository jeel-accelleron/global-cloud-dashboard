import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getProjectActivity,
  type ActivityRange,
  type ProjectActivityResponse,
} from '../../api/workItems';
import { Card, CardBody, CardHeader } from './Card';

const COLORS = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#3b82f6',
  '#a855f7',
  '#14b8a6',
  '#f97316',
];

interface Props {
  range: ActivityRange;
  /** Override server bucket granularity. */
  bucket?: 'day' | 'week' | 'month';
  topN?: number;
  title?: string;
  description?: string;
  /** Minimum chart height (the card grows if placed in a flex parent). */
  minHeight?: number;
}

/** Line chart of activity per Feature (project) over time. */
export function ProjectActivityChart({
  range,
  bucket,
  topN = 6,
  title = 'Project activity',
  description,
  minHeight = 280,
}: Props) {
  const [data, setData] = useState<ProjectActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getProjectActivity(range, bucket)
      .then((r) => {
        if (!cancelled) setData(r);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Failed to load activity');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, bucket]);

  const { rows, series } = useMemo(() => {
    if (!data) return { rows: [], series: [] as { key: string; color: string }[] };
    const top = data.projects.slice(0, topN);
    const rest = data.projects.slice(topN);
    const seriesKeys = top.map((p) => p.name);
    if (rest.length) seriesKeys.push('Other');

    const restByDate = new Map<string, number>();
    for (const p of rest) {
      for (const s of p.series) {
        restByDate.set(s.date, (restByDate.get(s.date) ?? 0) + s.count);
      }
    }

    const rows = data.buckets.map((b) => {
      const row: Record<string, number | string> = { date: b };
      for (const p of top) {
        const hit = p.series.find((s) => s.date === b);
        row[p.name] = hit ? hit.count : 0;
      }
      if (rest.length) row['Other'] = restByDate.get(b) ?? 0;
      return row;
    });

    return {
      rows,
      series: seriesKeys.map((key, i) => ({
        key,
        color: key === 'Other' ? '#94a3b8' : COLORS[i % COLORS.length],
      })),
    };
  }, [data, topN]);

  const subtitle =
    description ??
    (data
      ? topN >= data.projects.length
        ? `${data.projects.length} features by changes (bucketed by ${data.bucket})`
        : `Top ${topN} of ${data.projects.length} features by changes (bucketed by ${data.bucket})`
      : 'Loading…');

  const overlayMessage = loading
    ? 'Loading project activity…'
    : error
    ? error
    : rows.length === 0
    ? 'No activity in this period'
    : null;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader title={title} description={subtitle} />
      <CardBody className="flex-1">
        <div className="relative w-full" style={{ height: minHeight }}>
          {overlayMessage ? (
            <div className="flex h-full w-full items-center justify-center text-sm text-subtle">
              {overlayMessage}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
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
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {series.map((s) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
