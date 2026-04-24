import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

type Variant = 'default' | 'outline' | 'ghost' | 'danger' | 'brand';
type Size = 'sm' | 'md' | 'icon';

const variants: Record<Variant, string> = {
  default:
    'bg-elevated text-fg border border-border hover:bg-muted',
  outline:
    'bg-transparent border border-border hover:bg-muted text-fg',
  ghost:
    'bg-transparent hover:bg-muted text-fg',
  danger:
    'bg-danger text-white hover:opacity-90 border border-transparent',
  brand:
    'bg-brand text-brand-fg hover:opacity-90 border border-transparent shadow-sm',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs rounded-lg',
  md: 'h-9 px-4 text-sm rounded-xl',
  icon: 'h-9 w-9 rounded-xl flex items-center justify-center',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  className,
  variant = 'default',
  size = 'md',
  leftIcon,
  rightIcon,
  children,
  ...props
}: Props) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
