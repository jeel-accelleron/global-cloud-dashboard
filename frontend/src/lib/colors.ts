/**
 * Stable color tokens for chart series. Centralised so the same state /
 * priority / type is rendered with the same hue on every page, regardless
 * of the order data arrives in.
 */

const STATE_MAP: Record<string, string> = {
  New: '#94a3b8',
  Approved: '#3b82f6',
  Active: '#6366f1',
  'In Progress': '#6366f1',
  Committed: '#6366f1',
  Resolved: '#f59e0b',
  Closed: '#10b981',
  Done: '#10b981',
  Completed: '#10b981',
  Removed: '#cbd5e1',
};

const STATE_FALLBACK = ['#a855f7', '#0ea5e9', '#ec4899', '#14b8a6', '#f97316'];

export function stateColor(name: string): string {
  if (STATE_MAP[name]) return STATE_MAP[name];
  // Deterministic fallback based on string hash so unknown states still
  // get a stable color across renders.
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return STATE_FALLBACK[Math.abs(h) % STATE_FALLBACK.length];
}

const PRIORITY_MAP: Record<string, string> = {
  P1: '#ef4444',
  P2: '#f59e0b',
  P3: '#3b82f6',
  P4: '#94a3b8',
  'No Priority': '#cbd5e1',
};

export function priorityColor(name: string): string {
  return PRIORITY_MAP[name] ?? '#94a3b8';
}

const TYPE_MAP: Record<string, string> = {
  Bug: '#ef4444',
  Task: '#3b82f6',
  'User Story': '#6366f1',
  Feature: '#f59e0b',
  Epic: '#a855f7',
};

export function typeColor(name: string): string {
  return TYPE_MAP[name] ?? '#94a3b8';
}

/** Generic accent palette for ad-hoc series (e.g. owners). */
export const ACCENT_PALETTE = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#0ea5e9',
  '#94a3b8',
];

export function accentColor(i: number): string {
  return ACCENT_PALETTE[i % ACCENT_PALETTE.length];
}
