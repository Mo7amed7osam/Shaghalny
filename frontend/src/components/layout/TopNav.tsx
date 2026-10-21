import { motion } from 'framer-motion';
import { ChevronDown, LogOut, Menu, Moon, Sun, User } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Logo } from '@/components/brand/Logo';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { navByRole } from '@/components/layout/nav-config';
import { StudentPwaInstallButton } from '@/components/pwa/StudentPwaInstallButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import useAuth from '@/hooks/useAuth';
import { buildAssetUrl } from '@/lib/assets';
import { getTheme, setTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export const TopNav = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setThemeState] = useState<'light' | 'dark'>(getTheme());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigationFromDrawer = useRef(false);
  const profilePhotoUrl = buildAssetUrl(user?.profilePhotoUrl);

  const items = user ? navByRole[user.role] || [] : [];
  const primaryItems = user?.role === 'Student'
    ? ['Dashboard', 'Job Board', 'Skill Verification', 'Career Roadmap', 'Events', 'Profile', 'Wallet']
      .flatMap((label) => items.filter((item) => item.label === label))
    : items;

  const roleCopy = user?.role === 'Admin' ? 'Admin' : user?.role === 'Client' ? 'Client' : 'Student';

  const profilePath = useMemo(() => {
    if (user?.role === 'Student') return '/student/profile';
    if (user?.role === 'Client') return '/client/dashboard';
    return '/admin/dashboard';
  }, [user?.role]);

  const homePath = useMemo(() => {
    if (user?.role === 'Admin') return '/admin/dashboard';
    if (user?.role === 'Client') return '/client/dashboard';
    return '/student/dashboard';
  }, [user?.role]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setThemeState(next);
    setTheme(next);
  };

  // Close the drawer after navigation; Radix manages modal focus and scroll.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1280px)');
    const closeOnDesktop = () => { if (desktop.matches) setDrawerOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/80 shadow-soft backdrop-blur-xl supports-[backdrop-filter]:bg-white/80 dark:border-ink-dark-border dark:bg-ink-dark-bg/85 dark:supports-[backdrop-filter]:bg-ink-dark-bg/85">
        <div className="mx-auto grid h-[66px] w-full max-w-[1280px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 sm:px-6 lg:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <SheetTrigger asChild>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 xl:hidden dark:text-ink-400 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
            >
              <Menu size={18} />
            </button>
            </SheetTrigger>

            <NavLink to={homePath} className="flex shrink-0 items-center rounded-xl no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500" aria-label="Go to dashboard">
              <Logo markClassName="h-9 w-9" className="[&_.logo-wordmark]:hidden min-[430px]:[&_.logo-wordmark]:inline" />
            </NavLink>
          </div>

          <nav className="hidden min-w-0 items-center justify-center gap-[3px] rounded-full border border-ink-200 bg-ink-100/70 p-1 shadow-soft backdrop-blur-xl xl:flex dark:border-ink-dark-border dark:bg-white/[0.055]" aria-label="Primary">
            {primaryItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'relative isolate rounded-full px-[15px] py-2 text-[13.5px] font-medium leading-none no-underline transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                    isActive
                      ? 'font-semibold text-ink-900 dark:text-white'
                      : 'text-ink-500 hover:text-ink-900 dark:text-ink-dark-muted dark:hover:text-white'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive ? (
                      <motion.span
                        layoutId="topnav-active"
                        className="absolute inset-0 -z-10 rounded-full bg-white shadow-[0_0_0_1px_rgba(99,102,241,0.16),0_3px_10px_-4px_rgba(16,16,20,0.22),0_14px_34px_-16px_rgba(79,70,229,0.72)] dark:bg-white/[0.14] dark:shadow-[0_0_0_1px_rgba(129,140,248,0.24),0_3px_10px_-4px_rgba(0,0,0,0.75),0_14px_34px_-16px_rgba(129,140,248,0.72)]"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    ) : (
                      <span className="absolute inset-0 -z-10 rounded-full opacity-0 transition-opacity duration-150 hover:opacity-100 hover:bg-ink-200/50 dark:hover:bg-white/10" />
                    )}
                    <span className="whitespace-nowrap">
                      {item.label === 'Skill Verification' ? 'Verify' : item.label === 'Career Roadmap' ? 'Roadmap' : item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5">
            {user?.role === 'Student' ? <StudentPwaInstallButton /> : null}
            {user?.role === 'Student' ? <NotificationBell /> : null}

            <Button variant="outline" size="icon" className="h-[38px] w-[38px] rounded-[10px] p-0" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full border border-ink-200 bg-white p-[3px] pr-2 transition-colors hover:border-brand-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-ink-dark-border dark:bg-white/[0.055] dark:hover:border-brand-500/35"
                  aria-label="Open account menu"
                >
                  <Avatar className="h-7 w-7">
                    {profilePhotoUrl ? <AvatarImage src={profilePhotoUrl} alt={user?.name || 'Profile'} /> : null}
                    <AvatarFallback className="bg-gradient-to-br from-brand-300 to-brand-500 text-[10px] font-bold text-white">{getInitials(user?.name)}</AvatarFallback>
                  </Avatar>
                  <ChevronDown size={12} className="hidden text-ink-500 sm:block dark:text-ink-dark-muted" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold text-ink-900 dark:text-white">{user?.name}</p>
                    <Badge variant="brand">{roleCopy}</Badge>
                  </div>
                  <p className="truncate text-xs text-ink-500 dark:text-ink-400">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(profilePath)}>
                  <User size={14} />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onClick={logout}>
                  <LogOut size={14} />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <SheetContent
        side="left"
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          if (navigationFromDrawer.current) {
            event.preventDefault();
            document.getElementById('main-content')?.focus();
            navigationFromDrawer.current = false;
          }
        }}
        className="w-[19rem] max-w-[85vw] gap-0 p-0"
      >
        <div className="flex h-14 shrink-0 items-center border-b border-ink-200 px-4 dark:border-ink-dark-border">
          <SheetTitle>Navigation menu</SheetTitle>
        </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Primary">
        <div className="space-y-0.5">
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.to}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.04 * index, type: 'spring', stiffness: 320, damping: 28 }}
              >
                <NavLink
                  to={item.to}
                  onClick={() => { navigationFromDrawer.current = location.pathname !== item.to; }}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium no-underline transition-colors',
                      isActive
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                        : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-white/10 dark:hover:text-white'
                    )
                  }
                >
                  <Icon size={16} className="shrink-0" />
                  {item.label}
                </NavLink>
              </motion.div>
            );
          })}
        </div>
      </nav>

      <div className="shrink-0 border-t border-ink-200 p-3 dark:border-ink-dark-border">
        <div className="flex items-center gap-3 rounded-lg p-2">
          <Avatar className="h-8 w-8 shrink-0">
            {profilePhotoUrl ? <AvatarImage src={profilePhotoUrl} alt={user?.name || 'Profile'} /> : null}
            <AvatarFallback className="text-xs">{getInitials(user?.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{user?.name}</p>
            <p className="truncate text-xs text-ink-500 dark:text-ink-400">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
            aria-label="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
      </SheetContent>
    </Sheet>
  );
};
