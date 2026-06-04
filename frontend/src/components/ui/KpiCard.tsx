import type { LucideIcon } from '../icons';
import { Card, CardBody } from './Card';
import { cn } from '../../lib/utils';

type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'info';

const TONE_BORDER: Record<Tone, string> = {
  brand: 'bg-brand/10 text-brand border-brand/30',
  success: 'bg-success/10 text-success border-success/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  danger: 'bg-danger/10 text-danger border-danger/30',
  info: 'bg-info/10 text-info border-info/30',
};

const TONE_ICON: Record<Tone, string> = {
  brand: 'bg-brand/15 text-brand',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
  info: 'bg-info/15 text-info',
};

export function KpiCard({
  label,
  value,
  caption,
  delta,
  icon: Icon,
  tone = 'brand',
  variant = 'plain',
  loading,
}: {
  label: string;
  value: string | number;
  caption?: string;
  delta?: { value: string; positive?: boolean };
  icon?: LucideIcon;
  tone?: Tone;
  /** `bordered` adds a tinted 2px border + larger value, used by Dashboard/Projects KPIs. */
  variant?: 'plain' | 'bordered';
  loading?: boolean;
}) {
  const bordered = variant === 'bordered';
  return (
    <Card className={cn('h-full', bordered && cn('border-2', TONE_BORDER[tone]))}>
      <CardBody className="flex items-start justify-between gap-3">
        <div>
          <div
            className={cn(
              'text-xs font-medium',
              bordered
                ? 'font-semibold uppercase tracking-wide opacity-80'
                : 'text-subtle'
            )}
          >
            {label}
          </div>
          <div
            className={cn(
              'mt-2 font-semibold tracking-tight text-fg',
              bordered ? 'mt-3 text-4xl' : 'text-2xl'
            )}
          >
            {loading ? (
              <span className="skeleton inline-block h-7 w-16" />
            ) : (
              value
            )}
          </div>
          {caption && !loading && (
            <div className="mt-2 text-xs text-subtle">{caption}</div>
          )}
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
          <div className={cn('rounded-xl p-2.5', TONE_ICON[tone])}>
            <Icon size={18} />
          </div>
        )}
      </CardBody>
    </Card>
  );
}
