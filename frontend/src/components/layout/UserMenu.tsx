import { useEffect, useRef, useState } from 'react';
import { useTeam } from '../../hooks/useTeam';
import { useCurrentUser } from '../../lib/me';
import { initials } from '../../lib/utils';
import { ChevronDown, User2, UserX } from '../icons';
import { cn } from '../../lib/utils';

/**
 * Avatar in the Topbar. Click to pick "who am I?" from the team roster —
 * the choice is persisted to localStorage and powers the /my route.
 */
export function UserMenu() {
  const [me, setMe] = useCurrentUser();
  const { data } = useTeam();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const members = (data?.members ?? []).filter((m) => !!m.displayName);
  const meMember = members.find((m) => m.displayName === me);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-elevated pl-1 pr-2 text-xs hover:bg-muted"
        aria-haspopup="menu"
        aria-expanded={open}
        title={me ? `Signed in as ${me}` : 'Click to choose your identity'}
      >
        {meMember?.imageUrl ? (
          <img
            src={meMember.imageUrl}
            alt=""
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/10 text-[11px] font-semibold text-brand">
            {me ? initials(me) : '?'}
          </span>
        )}
        <span className="max-w-[120px] truncate font-medium text-fg">
          {me ?? 'Set me'}
        </span>
        <ChevronDown size={12} className="text-subtle" />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-40 w-72 overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
          <div className="border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-subtle">
            Choose your identity
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {members.length === 0 && (
              <li className="px-3 py-3 text-xs text-subtle">
                Loading team members…
              </li>
            )}
            {members.map((m) => {
              const name = m.displayName!;
              const selected = name === me;
              return (
                <li key={name}>
                  <button
                    onClick={() => {
                      setMe(name);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm',
                      selected
                        ? 'bg-brand/10 text-brand'
                        : 'text-fg hover:bg-muted'
                    )}
                  >
                    {m.imageUrl ? (
                      <img
                        src={m.imageUrl}
                        alt=""
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-[10px] font-semibold text-brand">
                        {initials(name)}
                      </span>
                    )}
                    <span className="flex-1 truncate">{name}</span>
                    {selected && <User2 size={13} />}
                  </button>
                </li>
              );
            })}
          </ul>
          {me && (
            <div className="border-t border-border p-2">
              <button
                onClick={() => {
                  setMe(null);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-subtle hover:bg-muted hover:text-fg"
              >
                <UserX size={13} />
                Clear identity
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
