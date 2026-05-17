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
import { Badge } from '@/components/ui/badge';
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
  Student: 'Student workspace',
  Client: 'Client workspace',
  Admin: 'Admin control',
};

export const Sidebar = () => {
  const { user } = useAuth();
  const items = user ? navByRole[user.role] || [] : [];

  return (
    <aside className="fixed inset-y-4 left-4 hidden w-72 md:block">
      <div className="glass-panel flex h-full flex-col px-5 py-5">
        <div className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-white/92 p-3 dark:border-white/10 dark:bg-white/8">
          <img src={logo} alt="Shaghalny" className="h-12 w-12 rounded-2xl object-contain" />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-ink-900 dark:text-white">Shaghalny</p>
            <p className="truncate text-xs uppercase tracking-[0.18em] text-ink-500 dark:text-ink-300">
              {user ? roleLabel[user.role as keyof typeof roleLabel] : 'Workspace'}
            </p>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between px-1">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-500 dark:text-ink-300">Navigation</p>
          {user ? <Badge variant="brand">{user.role}</Badge> : null}
        </div>

        <nav className="mt-4 flex-1 space-y-1.5">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200',
                    'text-ink-700 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-200 dark:hover:bg-white/8 dark:hover:text-white',
                    isActive &&
                    'bg-gradient-to-r from-brand-600 via-brand-500 to-accent-500 text-white shadow-soft hover:text-white dark:text-white'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-2xl transition-colors',
                        isActive
                          ? 'bg-white/15 text-white'
                          : 'bg-brand-100 text-brand-700 dark:bg-white/10 dark:text-brand-100'
                      )}
                    >
                      <Icon size={18} />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-6 rounded-2xl bg-ink-900 px-4 py-4 text-white dark:bg-[#07101d]">
          <p className="text-sm font-semibold text-white">Verified work wins faster.</p>
          <p className="mt-2 text-xs leading-5 text-white/82">
            Keep your profile, proposals, and interview status polished and up to date.
          </p>
        </div>
      </div>
    </aside>
  );
};
