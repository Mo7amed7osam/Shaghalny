import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';

import { Logo } from '@/components/brand/Logo';
import { getTheme, setTheme } from '@/lib/theme';
import { TileBackground } from './TileBackground';
import { useI18n } from '@/lib/i18n';
import { LanguageToggle } from '@/components/common/LanguageToggle';

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

/** Full-screen gradient mesh with one centered frosted-glass card. */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  const reduce = useReducedMotion();
  const { t } = useI18n();
  const [theme, setThemeState] = React.useState(getTheme());
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setThemeState(next);
  };
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f7ff] px-4 py-10 dark:bg-[#07060f]">
      {/* Interactive tile grid that lights up around the pointer */}
      <TileBackground />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(245,247,255,0.85)_100%)] dark:bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(7,6,15,0.9)_100%)]" />

      <div className="absolute end-4 top-4 z-10 flex items-center gap-2 sm:end-6 sm:top-6">
      <LanguageToggle className="h-11 rounded-full border-white/70 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.08]" />
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={t(theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme')}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/60 text-ink-700 shadow-[0_8px_24px_-12px_rgba(30,41,99,0.4)] backdrop-blur-xl transition hover:scale-105 hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.14]"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      </div>

      <motion.main
        id="main-content"
        tabIndex={-1}
        initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: EASE_OUT }}
        className="relative w-full max-w-[420px] rounded-[28px] border border-white/70 bg-white/65 p-7 shadow-[0_40px_120px_-30px_rgba(30,41,99,0.45),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl sm:p-9 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_40px_120px_-30px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)]"
      >
        <Link to="/" className="mb-8 flex justify-center text-ink-900 no-underline dark:text-white" aria-label="Shaghalny home">
          <Logo />
        </Link>
        <div className="mb-7 text-center">
          <h1 className="text-[1.65rem] font-semibold tracking-[-0.02em] text-ink-900 dark:text-white">{t(title)}</h1>
          <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-dark-muted">{t(subtitle)}</p>
        </div>
        {children}
        <div className="mt-7 text-center text-sm text-ink-500 dark:text-ink-dark-muted">{footer}</div>
      </motion.main>

      <p className="absolute bottom-4 left-0 right-0 text-center text-xs text-ink-500/80 dark:text-white/35">
        © {new Date().getFullYear()} Shaghalny · شغّلني
      </p>
    </div>
  );
}

/** Shared input styling for the glass card. */
export const authInputClass =
  'h-12 rounded-2xl border-ink-200/80 bg-white/80 ps-11 shadow-none focus:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:focus:bg-white/[0.09]';

export const authButtonClass =
  'group h-12 w-full rounded-2xl bg-gradient-to-r from-brand-600 via-brand-500 to-violet-500 text-[15px] shadow-[0_14px_34px_-12px_rgba(79,70,229,0.75)] transition hover:brightness-110 active:scale-[0.99]';
