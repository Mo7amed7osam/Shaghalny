import { NavLink } from 'react-router-dom';

import { cn } from '@/lib/utils';
import useAuth from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';

import { navByRole } from './nav-config';

export const MobileNav = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const items = user ? navByRole[user.role] || [] : [];
  const mobileItems = user?.role === 'Student'
    ? items.filter((item) => ['Dashboard', 'Job Board', 'Skill Verification', 'Career Roadmap', 'Events', 'Contracts', 'Wallet'].includes(item.label))
    : items.slice(0, 4);

  if (mobileItems.length === 0) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-ink-200 bg-white/[0.92] px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-18px_50px_-34px_rgba(16,16,20,0.35)] backdrop-blur-xl dark:border-ink-dark-border dark:bg-ink-dark-surface/95 md:hidden"
      aria-label="Primary"
    >
      <div className={`grid gap-1 py-1.5 ${mobileItems.length === 7 ? 'grid-cols-7' : mobileItems.length === 6 ? 'grid-cols-6' : mobileItems.length === 5 ? 'grid-cols-5' : 'grid-cols-4'}`}>
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const displayLabel = t(item.label === 'Skill Verification' ? 'Verify' : item.label === 'Career Roadmap' ? 'Roadmap' : item.label);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              aria-label={t(item.label)}
              className={({ isActive }) =>
                cn(
                  'flex min-h-12 flex-col items-center gap-1 rounded-[10px] px-1.5 py-2 text-center text-[10px] font-semibold transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-600 ring-1 ring-brand-100 dark:bg-brand-500/[0.15] dark:text-brand-300 dark:ring-brand-500/25'
                    : 'text-ink-500 hover:text-ink-900 dark:text-ink-dark-muted dark:hover:text-ink-dark-text'
                )
              }
            >
              <Icon size={18} />
              <span className="line-clamp-1">{displayLabel}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
