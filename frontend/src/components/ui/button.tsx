import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-brand-600 text-white shadow-soft hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-700',
        primary:
          'bg-brand-600 text-white shadow-soft hover:bg-brand-700',
        secondary:
          'bg-ink-900 text-white shadow-soft hover:bg-ink-800 dark:bg-ink-dark-surface dark:text-ink-dark-text dark:border dark:border-ink-dark-border dark:hover:bg-white/10',
        soft:
          'bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 hover:border-brand-300 dark:bg-brand-900/30 dark:text-brand-300 dark:border-brand-800 dark:hover:bg-brand-900/50',
        outline:
          'border border-ink-200 bg-white text-ink-700 shadow-soft hover:border-ink-300 hover:bg-ink-50 dark:border-ink-dark-border dark:bg-ink-dark-surface dark:text-ink-300 dark:hover:bg-white/10',
        ghost:
          'bg-transparent text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-white/10 dark:hover:text-ink-dark-text',
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
