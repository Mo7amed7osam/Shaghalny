import { useSyncExternalStore } from 'react';
import { ar } from './locales/ar';

export type Language = 'en' | 'ar';

const STORAGE_KEY = 'language';
const listeners = new Set<() => void>();

const readStored = (): Language => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
};

let current: Language = typeof window === 'undefined' ? 'en' : readStored();

const applyToDocument = (lang: Language) => {
  const root = document.documentElement;
  root.lang = lang;
  root.dir = lang === 'ar' ? 'rtl' : 'ltr';
};

export const getLanguage = () => current;

export const setLanguage = (lang: Language) => {
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* storage may be blocked; the choice still applies for this visit */
  }
  applyToDocument(lang);
  listeners.forEach((listener) => listener());
};

export const initLanguage = () => applyToDocument(current);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * English text is the key. Arabic falls back to English when a string has no
 * translation yet, so pages can be translated incrementally.
 * Placeholders use {name} syntax: t('{count} shown', { count: 3 }).
 */
export const translate = (lang: Language, text: string, vars?: Record<string, string | number>) => {
  const template = lang === 'ar' ? ar[text] ?? text : text;
  return vars ? template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`)) : template;
};

export function useI18n() {
  const lang = useSyncExternalStore(subscribe, getLanguage, () => 'en' as Language);
  return {
    lang,
    isRtl: lang === 'ar',
    t: (text: string, vars?: Record<string, string | number>) => translate(lang, text, vars),
    setLanguage,
    toggleLanguage: () => setLanguage(lang === 'ar' ? 'en' : 'ar'),
  };
}
