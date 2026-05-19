import { NavLink } from 'react-router-dom';
import {
  Briefcase, CalendarDays, ClipboardList, FileBadge,
  Home, LayoutDashboard, LogOut, Moon, ShieldCheck, Sun, Users, Wallet,
} from 'lucide-react';
import { useState } from 'react';

import logo from '@/assets/shaghalny-logo-premium.svg';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import useAuth from '@/hooks/useAuth';
import { getTheme, setTheme } from '@/lib/theme';
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

function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const [theme, setThemeState] = useState<'light' | 'dark'>(getTheme());
  const items = user ? navByRole[user.role as keyof typeof navByRole] || [] : [];

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setThemeState(next);
    setTheme(next);
  };

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-ink-200 bg-white dark:border-ink-dark-border dark:bg-ink-dark-surface md:flex">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-ink-200 px-5 dark:border-ink-dark-border">
        <img src={logo} alt="Shaghalny" className="h-8 w-8 rounded-lg object-contain" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink-900 dark:text-white">Shaghalny</p>
          <p className="truncate text-[10px] font-medium uppercase tracking-[0.18em] text-brand-500 dark:text-brand-400">
            {user?.role || 'Workspace'}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400 dark:text-ink-dark-muted">
          Navigation
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
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-white/8 dark:hover:text-white'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={16}
                      className={cn(
                        'shrink-0 transition-transform duration-150',
                        isActive ? 'text-white' : 'text-ink-400 group-hover:text-ink-700 dark:text-ink-500 dark:group-hover:text-white'
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* User footer */}
      <div className="shrink-0 border-t border-ink-100 p-3 dark:border-ink-dark-border">
        <div className="flex items-center gap-3 rounded-lg p-2">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="text-xs">{getInitials(user?.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{user?.name}</p>
            <p className="truncate text-xs text-ink-500 dark:text-ink-400">{user?.email}</p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              onClick={toggleTheme}
              className="flex h-7 w-7 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-white/8 dark:hover:text-white"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
            </button>
            <button
              onClick={logout}
              className="flex h-7 w-7 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
              aria-label="Sign out"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
