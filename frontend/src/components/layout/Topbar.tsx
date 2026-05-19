import { LogOut, Moon, Search, Sun } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import useAuth from '@/hooks/useAuth';
import { getTheme, setTheme } from '@/lib/theme';

const greetingLabel = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export const Topbar = () => {
  const { user, logout } = useAuth();
  const [theme, setThemeState] = useState<'light' | 'dark'>(getTheme());

  const roleCopy = useMemo(() => {
    if (user?.role === 'Admin') return 'Admin';
    if (user?.role === 'Client') return 'Client';
    return 'Student';
  }, [user?.role]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setThemeState(next);
    setTheme(next);
  };

  return (
    <header className="flex h-16 shrink-0 items-center border-b border-ink-200 bg-white px-6 dark:border-ink-dark-border dark:bg-ink-dark-surface">
      <div className="flex flex-1 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs text-ink-400 dark:text-ink-dark-muted">{greetingLabel()}</p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-ink-900 dark:text-ink-dark-text">{user?.name || 'Workspace'}</p>
              {user?.role ? <Badge variant="brand">{roleCopy}</Badge> : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="hidden h-9 items-center gap-2 rounded-lg border border-ink-200 bg-ink-50 px-3 text-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 sm:flex dark:border-ink-dark-border dark:bg-white/5 dark:focus-within:border-brand-500 dark:focus-within:ring-brand-500/20">
            <Search size={14} className="shrink-0 text-ink-400 dark:text-ink-dark-muted" />
            <input
              type="text"
              placeholder="Search..."
              className="w-44 bg-transparent text-sm text-ink-800 outline-none placeholder:text-ink-400 dark:text-ink-dark-text dark:placeholder:text-ink-dark-muted"
            />
          </label>

          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </Button>

          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut size={14} />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
};
