import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  caption?: React.ReactNode;
  badge?: string;
  tone?: 'default' | 'brand';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  caption,
  badge,
  tone = 'default',
  className,
}) => {
  return (
    <Card
      className={cn(
        'p-0',
        tone === 'brand' && 'border-brand-700 bg-brand-700 text-white dark:border-brand-600 dark:bg-brand-700',
        className
      )}
    >
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <p className={cn('text-sm font-medium', tone === 'brand' ? 'text-white/80' : 'text-ink-500 dark:text-ink-dark-muted')}>
            {label}
          </p>
          {badge ? <Badge variant={tone === 'brand' ? 'subtle' : 'brand'}>{badge}</Badge> : null}
        </div>
        <div className={cn('text-4xl font-semibold tracking-tight', tone === 'brand' ? 'text-white' : 'text-ink-900 dark:text-ink-dark-text')}>
          {value}
        </div>
        {caption ? (
          <p className={cn('text-sm', tone === 'brand' ? 'text-white/75' : 'text-ink-500 dark:text-ink-dark-muted')}>
            {caption}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
};
