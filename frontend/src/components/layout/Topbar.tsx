import { LogOut, Moon, Search, Sun, User } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StudentPwaInstallButton } from '@/components/pwa/StudentPwaInstallButton';
import useAuth from '@/hooks/useAuth';
import { getTheme, setTheme } from '@/lib/theme';
import { useNavigate } from 'react-router-dom';

const greetingLabel = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export const Topbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setThemeState] = useState<'light' | 'dark'>(getTheme());

  const roleCopy = useMemo(() => {
    if (user?.role === 'Admin') return 'Admin';
    if (user?.role === 'Client') return 'Client';
    return 'Student';
  }, [user?.role]);

  const profilePath = useMemo(() => {
    if (user?.role === 'Student') return '/student/profile';
    if (user?.role === 'Client') return '/client/dashboard';
    return '/admin/dashboard';
  }, [user?.role]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setThemeState(next);
    setTheme(next);
  };

  return (
    <header className="flex h-16 shrink-0 items-center border-b border-ink-200 bg-white px-4 sm:px-6 dark:border-ink-dark-border dark:bg-ink-dark-surface">
      <div className="flex flex-1 items-center justify-between gap-4">

        {/* Search */}
        <label className="hidden h-9 items-center gap-2 rounded-lg border border-ink-200 bg-ink-50 px-3 text-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 sm:flex dark:border-ink-dark-border dark:bg-white/5 dark:focus-within:border-brand-500 dark:focus-within:ring-brand-500/20">
          <Search size={14} className="shrink-0 text-ink-400 dark:text-ink-dark-muted" />
          <input
            type="text"
            placeholder="Search..."
            className="w-44 bg-transparent text-sm text-ink-800 outline-none placeholder:text-ink-400 dark:text-ink-dark-text dark:placeholder:text-ink-dark-muted"
          />
        </label>
        <div className="flex-1 sm:hidden" />

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {user?.role === 'Student' ? <StudentPwaInstallButton /> : null}
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm transition-colors hover:bg-ink-50 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-ink-dark-border dark:bg-ink-dark-surface dark:hover:bg-white/10">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px]">{getInitials(user?.name)}</AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[120px] truncate font-medium text-ink-900 dark:text-white sm:block">{user?.name}</span>
                <Badge variant="brand" className="hidden sm:inline-flex">{roleCopy}</Badge>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="font-normal">
                <p className="font-semibold text-ink-900 dark:text-white">{user?.name}</p>
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
  );
};
