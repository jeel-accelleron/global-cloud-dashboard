import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-subtle">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
