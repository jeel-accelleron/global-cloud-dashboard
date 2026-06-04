import { useNavigate } from 'react-router-dom';
import { Search, Moon, Sun } from '../icons';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useTheme } from '../../lib/theme';
import { useState } from 'react';
import { UserMenu } from './UserMenu';

export function Topbar({ onOpenPalette }: { onOpenPalette?: () => void }) {
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  const [q, setQ] = useState('');

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-surface px-4">
      <form
        className="flex flex-1 max-w-xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) nav(`/work-items?q=${encodeURIComponent(q.trim())}`);
        }}
      >
        <Input
          placeholder="Search work items, IDs, titles…"
          leftIcon={<Search size={15} />}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full"
          rightSlot={
            <button
              type="button"
              onClick={onOpenPalette}
              className="hidden md:inline-flex items-center rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-subtle hover:text-fg"
              title="Open command palette (Ctrl+K)"
            >
              ⌘K
            </button>
          }
        />
      </form>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </Button>
        <UserMenu />
      </div>
    </header>
  );
}
