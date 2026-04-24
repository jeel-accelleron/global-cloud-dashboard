import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({
  title = 'Nothing to show',
  description,
  icon,
  action,
}: {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="rounded-full bg-muted p-3 text-subtle">
        {icon ?? <Inbox size={22} />}
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        {description && (
          <div className="mt-1 text-xs text-subtle">{description}</div>
        )}
      </div>
      {action}
    </div>
  );
}
