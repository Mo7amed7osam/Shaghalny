import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50 active:scale-[0.985] dark:focus-visible:ring-offset-ink-dark-bg',
  {
    variants: {
      variant: {
        default:
          'bg-brand-600 text-white shadow-[0_4px_12px_-4px_rgba(99,102,241,0.55)] hover:bg-brand-600 hover:shadow-[0_8px_18px_-8px_rgba(99,102,241,0.7)] dark:bg-brand-600 dark:hover:bg-brand-700',
        primary:
          'bg-brand-600 text-white shadow-[0_4px_12px_-4px_rgba(99,102,241,0.55)] hover:bg-brand-600',
        secondary:
          'bg-ink-900 text-white shadow-soft hover:bg-ink-800 dark:border dark:border-white/10 dark:bg-white/10 dark:text-ink-dark-text dark:hover:bg-white/15',
        soft:
          'border border-brand-100 bg-brand-50 text-brand-600 hover:border-brand-200 dark:hover:border-brand-500/40 hover:bg-brand-100 dark:border-brand-500/25 dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/20',
        outline:
          'border border-ink-200 bg-white text-ink-700 shadow-soft hover:border-brand-200 hover:text-ink-900 dark:border-ink-dark-border dark:bg-white/[0.055] dark:text-ink-200 dark:hover:border-brand-500/35 dark:hover:bg-white/[0.1]',
        ghost:
          'bg-transparent text-ink-600 hover:bg-ink-100/80 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-white/10 dark:hover:text-ink-dark-text',
        danger:
          'bg-rose-600 text-white shadow-soft hover:bg-rose-700',
        success:
          'bg-accent-600 text-white shadow-soft hover:bg-accent-700',
      },
      size: {
        sm: 'min-h-8 px-3 text-xs',
        md: 'min-h-9 px-4 text-sm',
        lg: 'min-h-10 px-5 text-sm',
        xl: 'min-h-12 px-6 text-base font-semibold',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size }), className);

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        ...props,
        className: cn(classes, (children.props as { className?: string }).className),
      });
    }

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
