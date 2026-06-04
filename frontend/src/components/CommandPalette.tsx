import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CheckSquare,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  Search,
  Sparkles,
  Users,
  AlertTriangle,
  User2,
  Moon,
  RefreshCw,
  type LucideIcon,
} from './icons';
import { cn } from '../lib/utils';
import { useTheme } from '../lib/theme';
import { useQueryClient } from '@tanstack/react-query';

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  run: () => void;
  keywords?: string;
}

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const nav = useNavigate();
  const { toggle } = useTheme();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = useMemo(
    () => [
      { id: 'go-dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, hint: 'g d', run: () => nav('/dashboard') },
      { id: 'go-projects', label: 'Go to Projects', icon: FolderKanban, hint: 'g p', run: () => nav('/projects') },
      { id: 'go-pbis', label: 'Go to PBIs', icon: ClipboardList, hint: 'g b', run: () => nav('/pbis') },
      { id: 'go-tasks', label: 'Go to Tasks', icon: CheckSquare, hint: 'g t', run: () => nav('/tasks') },
      { id: 'go-missing', label: 'Go to Missing Components', icon: AlertTriangle, hint: 'g m', run: () => nav('/missing') },
      { id: 'go-work', label: 'Go to Work Items', icon: ListTodo, hint: 'g w', run: () => nav('/work-items') },
      { id: 'go-analytics', label: 'Go to Analytics', icon: BarChart3, hint: 'g a', run: () => nav('/analytics') },
      { id: 'go-team', label: 'Go to Team Insights', icon: Users, hint: 'g i', run: () => nav('/team') },
      { id: 'go-chat', label: 'Open AI Assistant', icon: Sparkles, hint: 'g c', run: () => nav('/chat') },
      { id: 'go-my', label: 'My Work', icon: User2, hint: 'g y', run: () => nav('/my') },
      { id: 'theme-toggle', label: 'Toggle theme', icon: Moon, hint: 't', run: () => toggle() },
      {
        id: 'refresh-all',
        label: 'Refresh data',
        icon: RefreshCw,
        hint: 'r',
        run: () => qc.invalidateQueries(),
      },
    ],
    [nav, toggle, qc]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    // Numeric query → jump to work-items search by ID.
    if (/^#?\d+$/.test(needle)) {
      const id = needle.replace('#', '');
      return [
        {
          id: `wi-${id}`,
          label: `Open work item #${id}`,
          icon: ListTodo,
          hint: '↵',
          run: () => nav(`/work-items?q=${id}`),
        } as Command,
        ...commands,
      ];
    }
    if (!needle) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(needle) ||
        (c.keywords ?? '').toLowerCase().includes(needle)
    );
  }, [q, commands, nav]);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      // defer focus to next frame so the input is mounted
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  if (!open) return null;

  const run = (cmd: Command) => {
    cmd.run();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-24"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search size={16} className="text-subtle" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((i) => Math.min(filtered.length - 1, i + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                const cmd = filtered[active];
                if (cmd) run(cmd);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              }
            }}
            placeholder="Search commands or jump to #1234…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-subtle">
            esc
          </kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-subtle">
              No matches
            </li>
          )}
          {filtered.map((cmd, i) => (
            <li key={cmd.id}>
              <button
                onClick={() => run(cmd)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm',
                  i === active
                    ? 'bg-brand/10 text-brand'
                    : 'text-fg hover:bg-muted'
                )}
              >
                <cmd.icon size={16} className="shrink-0 opacity-80" />
                <span className="flex-1 truncate">{cmd.label}</span>
                {cmd.hint && (
                  <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-subtle">
                    {cmd.hint}
                  </kbd>
                )}
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t border-border px-3 py-2 text-[11px] text-subtle">
          <kbd className="rounded border border-border bg-muted px-1 text-[10px]">↑</kbd>{' '}
          <kbd className="rounded border border-border bg-muted px-1 text-[10px]">↓</kbd>{' '}
          to navigate ·{' '}
          <kbd className="rounded border border-border bg-muted px-1 text-[10px]">↵</kbd>{' '}
          to select ·{' '}
          <kbd className="rounded border border-border bg-muted px-1 text-[10px]">/</kbd>{' '}
          focus search ·{' '}
          <kbd className="rounded border border-border bg-muted px-1 text-[10px]">?</kbd>{' '}
          shortcuts
        </div>
      </div>
    </div>
  );
}
