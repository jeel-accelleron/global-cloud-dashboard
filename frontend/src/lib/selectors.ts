import type { WorkItem } from '../api/types';

const CLOSED_STATES = new Set(['Closed', 'Done', 'Completed', 'Resolved', 'Removed']);
const ACTIVE_STATES = new Set(['Active', 'In Progress', 'Committed', 'Approved']);

export function isClosed(w: WorkItem) {
  return CLOSED_STATES.has(w.state);
}
export function isActive(w: WorkItem) {
  return ACTIVE_STATES.has(w.state);
}
export function isOverdue(w: WorkItem) {
  if (isClosed(w)) return false;
  // ADO items rarely populate DueDate; fall back to TargetDate / FinishDate
  // so the dashboard matches the Missing Components "overdue" bucket.
  const candidates = [w.dueDate, w.targetDate, w.finishDate];
  let earliest: number | null = null;
  for (const raw of candidates) {
    if (!raw) continue;
    const t = new Date(raw).getTime();
    if (!Number.isFinite(t)) continue;
    if (earliest === null || t < earliest) earliest = t;
  }
  return earliest !== null && earliest < Date.now();
}

export interface CountByKey {
  name: string;
  value: number;
}

export function countBy(items: WorkItem[], pick: (w: WorkItem) => string | null) {
  const map = new Map<string, number>();
  for (const it of items) {
    const k = pick(it) || 'Unknown';
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

export function trendByDay(
  items: WorkItem[],
  days = 30
): { date: string; created: number; completed: number }[] {
  const buckets: Record<string, { created: number; completed: number }> = {};
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = { created: 0, completed: 0 };
  }
  for (const it of items) {
    if (it.createdDate) {
      const k = it.createdDate.slice(0, 10);
      if (buckets[k]) buckets[k].created += 1;
    }
    if (it.closedDate) {
      const k = it.closedDate.slice(0, 10);
      if (buckets[k]) buckets[k].completed += 1;
    }
  }
  return Object.entries(buckets).map(([date, v]) => ({
    date: date.slice(5),
    created: v.created,
    completed: v.completed,
  }));
}

export function leaderboard(items: WorkItem[]) {
  const map = new Map<
    string,
    { name: string; assigned: number; completed: number; overdue: number }
  >();
  for (const it of items) {
    const name = it.assignedTo || 'Unassigned';
    const cur =
      map.get(name) ?? { name, assigned: 0, completed: 0, overdue: 0 };
    cur.assigned += 1;
    if (isClosed(it)) cur.completed += 1;
    if (isOverdue(it)) cur.overdue += 1;
    map.set(name, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.assigned - a.assigned);
}
