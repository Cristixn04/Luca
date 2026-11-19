import * as React from 'react';
import { cn } from '../utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'accent';
}

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-sm)] border px-2 py-0.5 text-xs font-medium tracking-wide',
        variant === 'accent'
          ? 'border-accent/30 bg-accent/10 text-accent'
          : 'border-border bg-bg text-muted',
        className,
      )}
      {...props}
    />
  );
}
