import type { LucideIcon } from 'lucide-react';
import { Card, CardBody } from './Card';
import { cn } from '../../lib/utils';

export function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  tone = 'brand',
  loading,
}: {
  label: string;
  value: string | number;
  delta?: { value: string; positive?: boolean };
  icon?: LucideIcon;
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'info';
  loading?: boolean;
}) {
  const toneCls: Record<string, string> = {
    brand: 'bg-brand/10 text-brand',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
    info: 'bg-info/10 text-info',
  };
  return (
    <Card>
      <CardBody className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-subtle">{label}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">
            {loading ? <span className="skeleton inline-block h-7 w-16" /> : value}
          </div>
          {delta && !loading && (
            <div
              className={cn(
                'mt-1 inline-flex items-center text-[11px] font-medium',
                delta.positive ? 'text-success' : 'text-danger'
              )}
            >
              {delta.positive ? '▲' : '▼'} {delta.value}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn('rounded-xl p-2.5', toneCls[tone])}>
            <Icon size={18} />
          </div>
        )}
      </CardBody>
    </Card>
  );
}
