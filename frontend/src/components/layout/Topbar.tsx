import { useNavigate } from 'react-router-dom';
import { Search, Moon, Sun, Bell } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useTheme } from '../../lib/theme';
import { initials } from '../../lib/utils';
import { useState } from 'react';

export function Topbar() {
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
        />
      </form>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell size={16} />
        </Button>
        <div className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
          {initials('You')}
        </div>
      </div>
    </header>
  );
}
