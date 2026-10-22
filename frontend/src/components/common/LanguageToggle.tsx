import { Languages } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** Switches between English and Arabic (right-to-left). */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, toggleLanguage } = useI18n();
  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      lang={lang === 'ar' ? 'en' : 'ar'}
      className={cn(
        'inline-flex h-[38px] items-center gap-1.5 rounded-[10px] border border-ink-200 bg-white px-2.5 text-[13px] font-semibold text-ink-700 transition hover:border-brand-200 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-ink-dark-border dark:bg-white/[0.055] dark:text-ink-200 dark:hover:text-white',
        className
      )}
    >
      <Languages size={15} />
      {lang === 'ar' ? 'EN' : 'عربي'}
    </button>
  );
}
