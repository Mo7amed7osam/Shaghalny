import {
  Briefcase,
  Calculator,
  Code,
  Film,
  GraduationCap,
  HeartPulse,
  Layers,
  Megaphone,
  Palette,
  Ruler,
  Scale,
  Tag,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { SkillCategory } from '@/types';

export interface SkillCategoryMeta {
  key: SkillCategory;
  label: string;
  icon: LucideIcon;
  badge: string;
}

const NEUTRAL_BADGE =
  'border-ink-200 bg-ink-50 text-ink-600 dark:border-ink-dark-border dark:bg-white/[0.055] dark:text-ink-300';

export const SKILL_CATEGORIES: SkillCategoryMeta[] = [
  {
    key: 'Programming',
    label: 'Programming',
    icon: Code,
    badge: 'border-brand-100 bg-brand-50 text-brand-700 dark:border-brand-400/25 dark:bg-brand-400/10 dark:text-brand-200',
  },
  {
    key: 'Design',
    label: 'Design',
    icon: Palette,
    badge: 'border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300',
  },
  {
    key: 'Business',
    label: 'Business',
    icon: Briefcase,
    badge: 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300',
  },
  {
    key: 'Engineering',
    label: 'Engineering',
    icon: Ruler,
    badge: 'border-accent-200 bg-accent-50 text-accent-700 dark:border-accent-500/20 dark:bg-accent-500/10 dark:text-accent-300',
  },
  {
    key: 'Media',
    label: 'Media',
    icon: Film,
    badge: 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  {
    key: 'Other',
    label: 'Other',
    icon: Layers,
    badge: NEUTRAL_BADGE,
  },
];


const ICON_HINTS: Array<[RegExp, LucideIcon]> = [
  [/market|sales|ads|advert|brand/i, Megaphone],
  [/health|medic|pharm|nurs|care/i, HeartPulse],
  [/law|legal/i, Scale],
  [/teach|educat|train|tutor/i, GraduationCap],
  [/financ|account|bank|econom/i, Calculator],
  [/mechanic|electric|maintenance|repair|manufactur/i, Wrench],
];

export const getCategoryMeta = (category?: string): SkillCategoryMeta => {
  const name = (category || 'Other').trim() || 'Other';
  const builtIn = SKILL_CATEGORIES.find((item) => item.key.toLowerCase() === name.toLowerCase());
  if (builtIn) return builtIn;

  const hint = ICON_HINTS.find(([pattern]) => pattern.test(name));
  return { key: name, label: name, icon: hint ? hint[1] : Tag, badge: NEUTRAL_BADGE };
};

export const getSkillCategory = (skill: any): SkillCategory =>
  (skill && typeof skill === 'object' && skill.category) || 'Other';

export const groupSkillsByCategory = <T extends { category?: string }>(skills: T[]) => {
  const buckets = new Map<string, T[]>();
  skills.forEach((skill) => {
    const key = getCategoryMeta(skill.category).key;
    buckets.set(key, [...(buckets.get(key) || []), skill]);
  });


  const orderOf = (key: string) => {
    if (key === 'Other') return 999;
    const index = SKILL_CATEGORIES.findIndex((item) => item.key === key);
    return index === -1 ? 100 : index;
  };

  return Array.from(buckets.entries())
    .sort(([a], [b]) => orderOf(a) - orderOf(b) || a.localeCompare(b))
    .map(([key, groupSkills]) => ({ meta: getCategoryMeta(key), skills: groupSkills }));
};
export const isPracticalCategory = (category?: string) =>
  ['design', 'media', 'engineering'].includes(String(category || '').trim().toLowerCase());
