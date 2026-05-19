import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition',
  {
    variants: {
      variant: {
        default:
          'border-ink-200 bg-ink-100 text-ink-700 dark:border-ink-dark-border dark:bg-white/10 dark:text-ink-300',
        subtle:
          'border-ink-200 bg-ink-100 text-ink-600 dark:border-ink-dark-border dark:bg-white/10 dark:text-ink-400',
        success:
          'border-accent-200 bg-accent-50 text-accent-800 dark:border-accent-700/40 dark:bg-accent-900/30 dark:text-accent-300',
        warning:
          'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-300',
        danger:
          'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-300',
        brand:
          'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-700/40 dark:bg-brand-900/30 dark:text-brand-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props} />
);
