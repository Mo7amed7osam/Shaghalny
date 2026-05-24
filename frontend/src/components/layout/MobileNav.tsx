import { NavLink } from 'react-router-dom';

import { cn } from '@/lib/utils';
import useAuth from '@/hooks/useAuth';

import { navByRole } from './Sidebar';

export const MobileNav = () => {
  const { user } = useAuth();
  const items = user ? navByRole[user.role] || [] : [];
  const mobileItems = user?.role === 'Student'
    ? items.filter((item) => ['Dashboard', 'Job Board', 'Skill Verification', 'Contracts', 'Wallet'].includes(item.label))
    : items.slice(0, 4);

  if (mobileItems.length === 0) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-ink-200 bg-white px-2 pb-safe dark:border-ink-dark-border dark:bg-ink-dark-surface md:hidden"
      aria-label="Primary"
    >
      <div className={`grid gap-1 py-1.5 ${mobileItems.length === 5 ? 'grid-cols-5' : 'grid-cols-4'}`}>
        {mobileItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 rounded-lg px-1.5 py-2 text-center text-[10px] font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                    : 'text-ink-500 hover:text-ink-900 dark:text-ink-dark-muted dark:hover:text-ink-dark-text'
                )
              }
            >
              <Icon size={18} />
              <span className="line-clamp-1">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
