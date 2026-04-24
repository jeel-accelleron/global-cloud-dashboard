import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ListTodo,
  BarChart3,
  Users,
  Sparkles,
  ChevronLeft,
  Cloud,
  FolderKanban,
  ClipboardList,
  CheckSquare,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const items = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/pbis', label: 'PBIs', icon: ClipboardList },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/missing', label: 'Missing Components', icon: AlertTriangle },
  { to: '/work-items', label: 'Work Items', icon: ListTodo },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/team', label: 'Team Insights', icon: Users },
  { to: '/chat', label: 'AI Assistant', icon: Sparkles },
];

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-surface transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div
        className={cn(
          'flex h-14 items-center border-b border-border px-3',
          collapsed ? 'justify-center' : 'justify-between'
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-fg shadow-sm">
              <Cloud size={16} />
            </div>
            <div className="truncate text-sm font-semibold tracking-tight">
              Global Cloud
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-subtle hover:bg-muted hover:text-fg transition-transform',
            collapsed && 'rotate-180'
          )}
          aria-label="Toggle sidebar"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {items.map((it) => (
            <li key={it.to}>
              <NavLink
                to={it.to}
                title={collapsed ? it.label : undefined}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center rounded-xl text-sm font-medium transition-colors',
                    collapsed
                      ? 'h-10 w-10 mx-auto justify-center'
                      : 'gap-3 px-3 py-2',
                    isActive
                      ? 'bg-brand/10 text-brand'
                      : 'text-subtle hover:bg-muted hover:text-fg'
                  )
                }
              >
                <it.icon size={18} className="shrink-0" />
                {!collapsed && <span className="truncate">{it.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {!collapsed && (
        <div className="border-t border-border p-3 text-[11px] text-subtle">
          <div className="rounded-xl bg-muted/60 p-3">
            <div className="font-semibold text-fg">Need data fast?</div>
            <div className="mt-1">
              Ask the AI Assistant in plain English.
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
