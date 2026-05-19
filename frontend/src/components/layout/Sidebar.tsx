import { NavLink } from 'react-router-dom';
import {
  Briefcase,
  CalendarDays,
  ClipboardList,
  FileBadge,
  Home,
  LayoutDashboard,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';

import logo from '@/assets/shaghalny-logo-premium.svg';
import useAuth from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export const navByRole = {
  Student: [
    { label: 'Dashboard', to: '/student/dashboard', icon: LayoutDashboard },
    { label: 'Job Board', to: '/student/jobs', icon: Briefcase },
    { label: 'Contracts', to: '/student/contracts', icon: ClipboardList },
    { label: 'Wallet', to: '/student/wallet', icon: Wallet },
    { label: 'Skill Verification', to: '/student/skill-verification', icon: FileBadge },
    { label: 'Profile', to: '/student/profile', icon: Home },
    { label: 'Events', to: '/events', icon: CalendarDays },
  ],
  Client: [
    { label: 'Dashboard', to: '/client/dashboard', icon: LayoutDashboard },
    { label: 'Post Job', to: '/client/post-job', icon: ClipboardList },
    { label: 'Proposals', to: '/client/view-proposals', icon: Users },
    { label: 'Contracts', to: '/client/contracts', icon: Briefcase },
    { label: 'Wallet', to: '/client/wallet', icon: Wallet },
  ],
  Admin: [
    { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Payments', to: '/admin/payments', icon: ShieldCheck },
    { label: 'Events', to: '/admin/events', icon: CalendarDays },
  ],
};

const roleLabel = {
  Student: 'Student',
  Client: 'Client',
  Admin: 'Admin',
};

export const Sidebar = () => {
  const { user } = useAuth();
  const items = user ? navByRole[user.role] || [] : [];

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-ink-200 bg-white dark:border-ink-dark-border dark:bg-ink-dark-surface md:flex md:flex-col">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-ink-200 px-5 dark:border-ink-dark-border">
        <img src={logo} alt="Shaghalny" className="h-8 w-8 rounded-lg object-contain" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-dark-text">Shaghalny</p>
          <p className="truncate text-[10px] uppercase tracking-[0.18em] text-ink-400 dark:text-ink-dark-muted">
            {user ? roleLabel[user.role as keyof typeof roleLabel] : 'Workspace'}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400 dark:text-ink-dark-muted">
          Menu
        </p>
        <div className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-600 text-white'
                      : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-dark-muted dark:hover:bg-white/8 dark:hover:text-ink-dark-text'
                  )
                }
              >
                <Icon size={16} className="shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      <div className="shrink-0 border-t border-ink-100 px-5 py-4 dark:border-ink-dark-border">
        <p className="text-xs font-medium text-ink-900 dark:text-ink-dark-text">Verified work wins.</p>
        <p className="mt-1 text-xs text-ink-400 dark:text-ink-dark-muted">
          Keep your profile and interview status up to date.
        </p>
      </div>
    </aside>
  );
};
