import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  Compass,
  Flag,
  Lightbulb,
  Loader2,
  RotateCcw,
  Rocket,
  Sparkles,
  Target,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/utils/constants';

type RoadmapBlock = {
  heading?: string;
  items: string[];
};

type RoadmapSection = {
  title: string;
  blocks: RoadmapBlock[];
};

type RoadmapContent = {
  heroTitle: string;
  sections: RoadmapSection[];
};

const stripEmoji = (text: string) =>
  text
    .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\uFE0F\u200D]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

const cleanLine = (line: string) =>
  stripEmoji(line)
    .replace(/^[\s•*\-–—]+/, '')
    .replace(/^\d+\)\s*/, '')
    .replace(/^\d+\.\s*/, '')
    .trim();

const isDecorativeLine = (line: string) => {
  const stripped = line
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F]/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();

  return stripped.length === 0;
};

const isHeadingLine = (line: string) => {
  if (!line || line.length > 90) return false;

  if (/:\s*$/.test(line)) return true;
  if (/^[A-Z0-9\s/&()+-]+:\s*.+$/.test(line)) return true;
  if (/^(bonus|note|focus|optional)\s*:/i.test(line)) return true;

  return false;
};

const parseBlocks = (body: string): RoadmapBlock[] => {
  const lines = body
    .split('\n')
    .map((line) => cleanLine(line))
    .filter(Boolean);

  const blocks: RoadmapBlock[] = [];
  let current: RoadmapBlock | null = null;

  for (const line of lines) {
    if (/^or$/i.test(line)) {
      continue;
    }

    if (isHeadingLine(line)) {
      if (current && (current.heading || current.items.length > 0)) {
        blocks.push(current);
      }
      current = {
        heading: line.replace(/:\s*$/, ''),
        items: [],
      };
      continue;
    }

    if (!current) {
      current = { items: [] };
    }

    current.items.push(line);
  }

  if (current && (current.heading || current.items.length > 0)) {
    blocks.push(current);
  }

  return blocks;
};

const parseRoadmap = (roadmap: string): RoadmapContent | null => {
  const normalized = roadmap.replace(/\r\n/g, '\n').trim();
  if (!normalized) return null;

  const sectionRegex = /(?:^|\n)(\d+)\.\s+([^\n]+)\n?([\s\S]*?)(?=(?:\n\d+\.\s+)|$)/g;
  const matches = Array.from(normalized.matchAll(sectionRegex));

  let heroTitle = 'Your personalized roadmap';
  let body = normalized;

  if (matches.length > 0) {
    const firstSectionIndex = normalized.search(/\n?\d+\.\s+/);
    const intro = normalized.slice(0, firstSectionIndex).trim();
    if (intro) {
      const introLines = intro
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const meaningfulIntro = introLines.find((line) => !isDecorativeLine(line));

      if (meaningfulIntro) {
        heroTitle = meaningfulIntro;
      }
    }
  } else {
    const lines = normalized.split('\n').filter(Boolean);
    if (lines.length > 0) {
      const meaningfulLine = lines.find((line) => !isDecorativeLine(line.trim()));
      heroTitle = meaningfulLine || heroTitle;
      body = lines.slice(1).join('\n').trim();
    }
  }

  const sections =
    matches.length > 0
      ? matches.map(([, , title, content]) => ({
          title: cleanLine(title),
          blocks: parseBlocks(content),
        }))
      : [
          {
            title: 'Roadmap',
            blocks: parseBlocks(body || normalized),
          },
        ];

  return {
    heroTitle: isDecorativeLine(heroTitle) ? 'Your personalized career roadmap' : stripEmoji(heroTitle),
    sections,
  };
};

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

/** Frosted-glass surface matching the auth screens. */
const glassClass =
  'rounded-[28px] border border-white/70 bg-white/65 shadow-[0_40px_120px_-40px_rgba(30,41,99,0.35),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_40px_120px_-40px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)]';

// Mirrors the auth screens' input/button styling.
const inputClass =
  'h-12 rounded-2xl border-ink-200/80 bg-white/80 ps-11 shadow-none focus:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:focus:bg-white/[0.09]';

const buttonClass =
  'group h-12 w-full rounded-2xl bg-gradient-to-r from-brand-600 via-brand-500 to-violet-500 text-[15px] shadow-[0_14px_34px_-12px_rgba(79,70,229,0.75)] transition hover:brightness-110 active:scale-[0.99]';

const GOAL_SUGGESTIONS = ['Backend Developer', 'UI/UX Designer', 'Data Analyst', 'Mobile Developer', 'DevOps Engineer'];

const getSectionMeta = (title: string) => {
  const normalized = title.toLowerCase();

  if (normalized.includes('skill')) {
    return { icon: Target, badge: 'Core skills', accent: 'from-brand-500 to-indigo-500' };
  }

  if (normalized.includes('learning') || normalized.includes('plan')) {
    return { icon: BookOpen, badge: 'Study plan', accent: 'from-violet-500 to-fuchsia-500' };
  }

  if (normalized.includes('project')) {
    return { icon: Rocket, badge: 'Portfolio', accent: 'from-sky-500 to-cyan-500' };
  }

  if (normalized.includes('job') || normalized.includes('freelance')) {
    return { icon: BriefcaseBusiness, badge: 'Getting hired', accent: 'from-emerald-500 to-teal-500' };
  }

  return { icon: Compass, badge: 'Roadmap step', accent: 'from-indigo-500 to-violet-500' };
};

const CareerRoadmap: React.FC = () => {
  const reduce = useReducedMotion();
  const [goal, setGoal] = useState('');
  const [submittedGoal, setSubmittedGoal] = useState('');
  const [roadmap, setRoadmap] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const parsedRoadmap = useMemo(() => parseRoadmap(roadmap), [roadmap]);
  const totalItems = useMemo(
    () =>
      parsedRoadmap?.sections.reduce(
        (sum, section) => sum + section.blocks.reduce((acc, block) => acc + block.items.length, 0),
        0
      ) ?? 0,
    [parsedRoadmap]
  );

  const generateRoadmap = async (target = goal) => {
    const trimmed = target.trim();
    if (!trimmed || isLoading) return;
    setGoal(trimmed);
    setSubmittedGoal(trimmed);
    setIsLoading(true);
    setRoadmap('');
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/ai/career-roadmap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ goal: trimmed }),
      });
      const data = await response.json();
      if (!response.ok || !data.roadmap) {
        setError(data.message || 'Could not generate a roadmap for that goal.');
      } else {
        setRoadmap(data.roadmap);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fadeUp = (delay = 0) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, ease: EASE_OUT, delay },
        };

  return (
    <div className="space-y-6">
      {/* Hero + goal input */}
      <motion.section {...fadeUp()} className={cn(glassClass, 'relative overflow-hidden p-6 sm:p-9')}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-brand-500/25 to-violet-500/25 blur-3xl"
        />
        <div className="relative mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200/70 bg-white/70 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-brand-200">
            <Sparkles size={13} />
            AI Career Assistant
          </span>
          <h1 className="mt-4 text-[1.9rem] font-semibold tracking-[-0.02em] text-ink-900 sm:text-[2.4rem] dark:text-white">
            Map your path to{' '}
            <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-violet-500 bg-clip-text text-transparent dark:from-brand-300 dark:via-brand-200 dark:to-violet-300">
              your next role
            </span>
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-500 dark:text-ink-dark-muted">
            Name a specific role and get a step-by-step plan: skills, study path, portfolio projects, and how to land work.
          </p>

          <form
            className="mt-7 flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              generateRoadmap();
            }}
          >
            <label htmlFor="career-goal" className="sr-only">
              Career goal
            </label>
            <div className="relative flex-1">
              <Flag
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400"
                aria-hidden="true"
              />
              <Input
                id="career-goal"
                placeholder="e.g. I want to become a Backend Developer"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                disabled={isLoading}
                className={inputClass}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={isLoading || !goal.trim()}
              className={cn(buttonClass, 'sm:w-auto sm:min-w-[170px]')}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {isLoading ? 'Generating…' : 'Generate'}
              {!isLoading ? (
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              ) : null}
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap justify-center gap-2" aria-label="Suggested goals">
            {GOAL_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={isLoading}
                onClick={() => generateRoadmap(suggestion)}
                className="rounded-full border border-ink-200/70 bg-white/60 px-3 py-1.5 text-xs font-medium text-ink-600 transition hover:border-brand-300 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-ink-300 dark:hover:border-brand-400/50 dark:hover:text-white"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </motion.section>

      {isLoading ? (
        <div className="space-y-4" aria-busy="true" aria-live="polite">
          <p className="sr-only">Generating your roadmap…</p>
          <div className={cn(glassClass, 'space-y-3 p-6')}>
            <div className="h-3 w-32 animate-pulse rounded-full bg-ink-200/70 dark:bg-white/10" />
            <div className="h-7 w-2/3 animate-pulse rounded-full bg-ink-200/70 dark:bg-white/10" />
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-2xl bg-ink-100/80 dark:bg-white/[0.06]" />
              ))}
            </div>
          </div>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className={cn(glassClass, 'flex gap-4 p-6')}>
              <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-ink-200/70 dark:bg-white/10" />
              <div className="flex-1 space-y-3">
                <div className="h-5 w-48 animate-pulse rounded-full bg-ink-200/70 dark:bg-white/10" />
                <div className="h-12 animate-pulse rounded-2xl bg-ink-100/80 dark:bg-white/[0.06]" />
                <div className="h-12 animate-pulse rounded-2xl bg-ink-100/80 dark:bg-white/[0.06]" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <motion.div {...fadeUp()} role="alert" className={cn(glassClass, 'flex flex-col items-center gap-3 p-8 text-center')}>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertTriangle size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink-900 dark:text-white">Couldn&apos;t build your roadmap</h2>
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-dark-muted">{error}</p>
          </div>
          <Button variant="outline" className="rounded-2xl" onClick={() => generateRoadmap(submittedGoal)}>
            <RotateCcw size={15} />
            Try again
          </Button>
        </motion.div>
      ) : parsedRoadmap ? (
        <div className="space-y-6">
          {/* Summary */}
          <motion.section {...fadeUp()} className={cn(glassClass, 'p-6 sm:p-7')}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 space-y-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-600 dark:text-brand-300">
                  <Sparkles size={13} />
                  Personalized roadmap
                </span>
                <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink-900 sm:text-2xl dark:text-white">
                  {parsedRoadmap.heroTitle}
                </h2>
              </div>
              <dl className="grid shrink-0 grid-cols-3 gap-2 sm:gap-3">
                {[
                  { label: 'Goal', value: submittedGoal },
                  { label: 'Steps', value: parsedRoadmap.sections.length },
                  { label: 'Actions', value: totalItems },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="min-w-0 rounded-2xl border border-ink-200/70 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.05]"
                  >
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500 dark:text-ink-dark-muted">
                      {stat.label}
                    </dt>
                    <dd className="mt-1 max-w-[180px] truncate text-sm font-semibold text-ink-900 dark:text-white" title={String(stat.value)}>
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </motion.section>

          {/* Timeline of steps */}
          <ol className="relative space-y-5">
            <span
              aria-hidden="true"
              className="absolute bottom-6 left-[27px] top-6 hidden w-px bg-gradient-to-b from-brand-400/60 via-violet-400/40 to-transparent sm:block"
            />
            {parsedRoadmap.sections.map((section, index) => {
              const meta = getSectionMeta(section.title);
              const Icon = meta.icon;

              return (
                <motion.li
                  key={section.title + index}
                  {...fadeUp(0.08 + index * 0.07)}
                  className="relative sm:pl-[76px]"
                >
                  <div
                    className={cn(
                      'absolute left-0 top-6 hidden h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-[0_14px_34px_-12px_rgba(79,70,229,0.6)] ring-4 ring-ink-50 sm:flex dark:ring-ink-dark-bg',
                      meta.accent
                    )}
                  >
                    <Icon size={22} />
                  </div>

                  <article className={cn(glassClass, 'p-5 sm:p-7')}>
                    <header className="flex items-start gap-3">
                      <div
                        className={cn(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white sm:hidden',
                          meta.accent
                        )}
                      >
                        <Icon size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500 dark:text-ink-dark-muted">
                          Step {String(index + 1).padStart(2, '0')} · {meta.badge}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold tracking-[-0.01em] text-ink-900 sm:text-xl dark:text-white">
                          {section.title}
                        </h3>
                      </div>
                    </header>

                    <div className="mt-5 space-y-5">
                      {section.blocks.map((block, blockIndex) => (
                        <div key={`${section.title}-${blockIndex}`} className="space-y-2.5">
                          {block.heading ? (
                            <div className="flex items-center gap-2">
                              <Lightbulb size={15} className="text-brand-500 dark:text-brand-300" />
                              <h4 className="text-sm font-semibold text-ink-900 dark:text-white">{block.heading}</h4>
                            </div>
                          ) : null}

                          <ul className="grid gap-2 md:grid-cols-2">
                            {block.items.map((item, itemIndex) => (
                              <li
                                key={`${section.title}-${blockIndex}-${itemIndex}`}
                                className="flex items-start gap-3 rounded-2xl border border-ink-200/60 bg-white/70 px-4 py-3 transition hover:border-brand-300/70 hover:bg-white dark:border-white/[0.08] dark:bg-white/[0.04] dark:hover:border-brand-400/40 dark:hover:bg-white/[0.07]"
                              >
                                {block.heading ? (
                                  <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-brand-500 dark:text-brand-300" />
                                ) : (
                                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700 dark:bg-brand-400/15 dark:text-brand-200">
                                    {itemIndex + 1}
                                  </span>
                                )}
                                <p className="text-sm leading-6 text-ink-700 dark:text-ink-200">{item}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </article>
                </motion.li>
              );
            })}
          </ol>
        </div>
      ) : (
        <motion.div {...fadeUp(0.1)} className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Target, title: 'Core skills', text: 'The exact skills employers expect for your role.', accent: 'from-brand-500 to-indigo-500' },
            { icon: BookOpen, title: 'Study plan', text: 'A week-by-week path with what to learn first.', accent: 'from-violet-500 to-fuchsia-500' },
            { icon: Rocket, title: 'Portfolio & hiring', text: 'Projects to build and how to land paid work.', accent: 'from-sky-500 to-cyan-500' },
          ].map((feature) => (
            <div key={feature.title} className={cn(glassClass, 'p-5')}>
              <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white', feature.accent)}>
                <feature.icon size={20} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-ink-900 dark:text-white">{feature.title}</h3>
              <p className="mt-1 text-sm leading-6 text-ink-500 dark:text-ink-dark-muted">{feature.text}</p>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default CareerRoadmap;
