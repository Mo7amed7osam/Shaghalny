import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'min-h-10 w-full rounded-xl border border-ink-500 bg-white/90 px-3.5 text-sm text-ink-900 outline-none shadow-soft transition duration-150 placeholder:text-ink-500 hover:border-ink-600 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:opacity-60 dark:border-ink-dark-muted dark:bg-white/[0.07] dark:text-ink-dark-text dark:placeholder:text-ink-dark-muted dark:hover:border-brand-500/45 dark:focus:border-brand-500 dark:focus:ring-brand-500/20',
        type === 'file' &&
          'cursor-pointer p-2 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-900/30 dark:file:text-brand-300',
        className
      )}
      {...props}
    />
  )
);

Input.displayName = 'Input';
