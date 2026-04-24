import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
}

export function Input({ className, leftIcon, rightSlot, ...props }: Props) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 h-9 rounded-xl border border-border bg-elevated px-3 text-sm focus-within:ring-2 focus-within:ring-brand/40',
        className
      )}
    >
      {leftIcon && <span className="text-subtle">{leftIcon}</span>}
      <input
        className="flex-1 bg-transparent outline-none placeholder:text-subtle"
        {...props}
      />
      {rightSlot}
    </div>
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-9 rounded-xl border border-border bg-elevated px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
