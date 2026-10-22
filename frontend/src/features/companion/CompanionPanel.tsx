import React, { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Briefcase, ChevronDown, FileText, Languages, Map, MessageSquare, PenLine, RotateCcw, SendHorizontal, Sparkles, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CompanionCharacter } from './CompanionCharacter';
import { MessageView, type CompanionCardHandlers } from './CompanionMessages';
import { useLivingPose } from './useLivingPose';
import type { CompanionStrings } from './companionI18n';
import { companionStore, type CompanionStoreState } from './companionStore';
import type { CompanionIntent, CompanionJobCard, CompanionMessage, CompanionState, CompanionTask, JobPreferences } from './types';

const CV_LIMIT = 15000;

const TASK_ICONS: Record<CompanionTask, React.ComponentType<{ className?: string }>> = {
  jobs: Briefcase,
  cv: FileText,
  proposal: PenLine,
  plan: Map,
  chat: MessageSquare,
};

const TASK_TONES: Record<CompanionTask, string> = {
  jobs: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200',
  cv: 'bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300',
  proposal: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  plan: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  chat: 'bg-ink-100 text-ink-700 dark:bg-white/10 dark:text-ink-200',
};

export interface SendOptions {
  jobId?: string | null;
  cvText?: string | null;
  displayText?: string;
  preferences?: JobPreferences | null;
}

interface PanelProps {
  s: CompanionStoreState;
  t: CompanionStrings;
  dir: 'ltr' | 'rtl';
  isMobile: boolean;
  isStudent: boolean;
  isGuest: boolean;
  firstName?: string;
  panelId: string;
  titleId: string;
  style: React.CSSProperties;
  charState: CompanionState;
  greetKey: number;
  demoActive: boolean;
  pathname: string;
  handlers: CompanionCardHandlers;
  send: (text: string, intent: CompanionIntent, task: CompanionTask, extra?: SendOptions) => void;
  onMinimize: () => void;
  onDismiss: () => void;
  onNewChat: () => void;
  onGoJobBoard: () => void;
}

const pendingLabel = (t: CompanionStrings, intent: CompanionIntent | null) =>
  intent === 'find_jobs' ? t.searching : intent === 'review_cv' ? t.reviewing : intent === 'write_proposal' ? t.writing : intent === 'plan_career' ? t.panel.planning : t.thinking;

// Messages that belong to a workspace. The free conversation shows everything.
const inTask = (m: CompanionMessage, task: CompanionTask) => task === 'chat' || (m.task || 'chat') === task;

/** Unique job cards from the conversation, newest first (for picking a job). */
const recentCards = (messages: CompanionMessage[]) => {
  const seen = new Set<string>();
  const out: CompanionJobCard[] = [];
  for (const m of [...messages].reverse()) {
    for (const c of m.response?.cards || []) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        out.push(c);
      }
    }
  }
  return out;
};

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        active
          ? 'border-brand-500 bg-brand-600 text-white dark:border-brand-400'
          : 'border-ink-200 bg-white text-ink-700 hover:border-brand-200 hover:bg-brand-50 dark:border-ink-dark-border dark:bg-white/[0.04] dark:text-ink-200 dark:hover:bg-white/10'
      )}
    >
      {children}
    </button>
  );
}

function Composer({
  t, placeholder, disabled, onSubmit, autoFocus, id,
}: { t: CompanionStrings; placeholder: string; disabled: boolean; onSubmit: (text: string) => void; autoFocus?: boolean; id: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = React.useState('');
  useEffect(() => {
    if (!autoFocus) return;
    const f = requestAnimationFrame(() => ref.current?.focus());
    return () => cancelAnimationFrame(f);
  }, [autoFocus]);
  const submit = () => {
    if (!value.trim() || disabled) return;
    onSubmit(value.trim());
    setValue('');
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex items-end gap-2">
      <label htmlFor={id} className="sr-only">{t.inputLabel}</label>
      <textarea
        id={id}
        ref={ref}
        value={value}
        maxLength={4000}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        rows={1}
        placeholder={placeholder}
        className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-ink-200 bg-ink-50 px-3 py-2.5 text-[16px] leading-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-ink-dark-border dark:bg-white/[0.04] sm:text-[13.5px]"
      />
      <Button type="submit" size="icon" className="h-[42px] w-[42px] shrink-0 rounded-xl" disabled={!value.trim() || disabled} aria-label={t.send}>
        <SendHorizontal className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
      </Button>
    </form>
  );
}

export function CompanionPanel(props: PanelProps) {
  const { s, t, dir, isMobile, isStudent, isGuest, panelId, titleId, style, charState, greetKey, demoActive, handlers, send } = props;
  const view = isStudent ? s.view : 'home';
  const task = view === 'home' ? null : view;
  const listRef = useRef<HTMLDivElement>(null);
  const hero = useLivingPose(charState, { greetKey });
  const working = useLivingPose(charState);
  const focusJob = s.selectedJob || s.pageJob;
  const taskMessages = useMemo(() => (task ? s.messages.filter((m) => inTask(m, task)) : []), [s.messages, task]);
  const pendingHere = Boolean(s.pending) && (task === 'chat' || s.messages[s.messages.length - 1]?.task === task || !task);

  const go = (v: CompanionStoreState['view']) => companionStore.set({ view: v });

  // Keep the newest result in view: scroll to its start, not its end.
  useEffect(() => {
    const el = listRef.current;
    if (!el || !task) return;
    const items = el.querySelectorAll<HTMLElement>('[data-shaghol-msg]');
    const last = items[items.length - 1];
    if (!s.pending && last && last.dataset.role === 'assistant') el.scrollTop = Math.max(0, last.offsetTop - 8);
    else el.scrollTop = el.scrollHeight;
  }, [taskMessages.length, s.pending, task]);

  // ---- Task actions (all reuse the existing backend intents) ----
  const searchJobs = (query?: string) => {
    const q = (query ?? s.jobQuery).trim();
    send(q || t.starters.findJobs, 'find_jobs', 'jobs', { preferences: s.jobPrefs });
  };
  const reviewCv = () => {
    const text = s.cvDraft.trim();
    if (!text) return;
    const job = focusJob;
    const display = t.cvUserMessage(text.length, job?.title);
    send(display, 'review_cv', 'cv', { cvText: text, jobId: job?.id || null, displayText: display });
  };
  const draftProposal = () => {
    if (!focusJob) return;
    send(t.proposalUserMessage(focusJob.title), 'write_proposal', 'proposal', { jobId: focusJob.id });
  };
  const buildPlan = (goal?: string) => {
    const g = (goal ?? s.planGoal).trim();
    if (!g) return;
    send(g, 'plan_career', 'plan');
  };
  const followUp = (text: string) => {
    // After results, follow-ups are questions about them; the model can still search again.
    if (task === 'jobs') send(text, lastResult ? 'chat' : 'find_jobs', 'jobs', { preferences: s.jobPrefs, jobId: focusJob?.id || null });
    else if (task === 'proposal' && focusJob) send(text, 'write_proposal', 'proposal', { jobId: focusJob.id });
    else if (task === 'plan') send(text, 'plan_career', 'plan');
    else send(text, 'chat', task || 'chat', { jobId: focusJob?.id || null });
  };
  const openTask = (next: CompanionTask) => go(next);

  // Contextual suggestion for the current page or selected job.
  const suggestion = useMemo(() => {
    const p = props.pathname;
    if (focusJob) return { label: t.proposalUserMessage(focusJob.title), run: () => { go('proposal'); } };
    if (p.startsWith('/student/skill-verification')) return { label: t.starters.verification, run: () => { go('chat'); send(t.starters.verification, 'chat', 'chat'); } };
    if (p.startsWith('/student/profile')) return { label: t.starters.reviewCv, run: () => go('cv') };
    if (p.startsWith('/student/career-roadmap')) return { label: t.starters.roadmap, run: () => go('plan') };
    if (p.startsWith('/student/jobs') || p.startsWith('/student/dashboard')) return { label: t.starters.findJobs, run: () => { go('jobs'); searchJobs(''); } };
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.pathname, focusJob?.id, t]);

  const lastResult = [...taskMessages].reverse().find((m) => m.role === 'assistant' && m.response && !m.error);

  // Relevant follow-ups once a task has produced a result.
  const nextSteps = (() => {
    if (!task || !lastResult || s.pending) return [] as { key: string; label: string; run: () => void }[];
    const items: { key: string; label: string; run: () => void }[] = [];
    if (task === 'jobs') {
      if (focusJob) {
        items.push({ key: 'proposal', label: t.proposalUserMessage(focusJob.title), run: () => go('proposal') });
        items.push({ key: 'cv', label: `${t.card.tailorCv}: ${focusJob.title}`, run: () => go('cv') });
      }
      items.push({ key: 'board', label: `${t.openPage} ${t.pages.jobs}`, run: props.onGoJobBoard });
    } else if (task === 'cv') {
      items.push({ key: 'proposal', label: t.panel.tasks.proposal.title, run: () => go('proposal') });
      items.push({ key: 'jobs', label: t.panel.tasks.jobs.title, run: () => go('jobs') });
    } else if (task === 'proposal') {
      items.push({ key: 'cv', label: t.panel.tasks.cv.title, run: () => go('cv') });
      items.push({ key: 'jobs', label: t.panel.tasks.jobs.title, run: () => go('jobs') });
    } else if (task === 'plan') {
      items.push({ key: 'jobs', label: t.panel.tasks.jobs.title, run: () => go('jobs') });
      items.push({ key: 'roadmap', label: `${t.openPage} ${t.pages.career_roadmap}`, run: () => handlers.onOpenPage('career_roadmap') });
    }
    return items;
  })();

  const busy = Boolean(s.pending);
  const header = (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-ink-200 px-2 dark:border-ink-dark-border">
      {task ? (
        <Button size="sm" variant="ghost" className="h-8 gap-1 px-2 text-[12.5px]" onClick={() => go('home')}>
          <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
          {t.panel.back}
        </Button>
      ) : (
        <span className="flex items-center gap-1.5 ps-1.5">
          <CompanionCharacter state={working.pose} blink={working.blink} size={26} />
        </span>
      )}
      <h2 id={titleId} className="min-w-0 flex-1 truncate text-[14px] font-semibold">
        {task ? t.panel.tasks[task].title : t.name}
      </h2>
      {demoActive && isStudent && !task && (
        <span title={t.panel.demoTip} className="hidden items-center gap-1 whitespace-nowrap text-[11px] font-medium text-ink-500 dark:text-ink-400 sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
          {t.panel.demoNote}
        </span>
      )}
      <div className="flex items-center">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => companionStore.setLang(s.lang === 'ar' ? 'en' : 'ar')} aria-label={t.languageLabel} title={t.languageLabel}>
          <Languages className="h-4 w-4" aria-hidden />
        </Button>
        {isStudent && s.messages.length > 0 && (
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={props.onNewChat} aria-label={t.newChat} title={t.newChat}>
            <RotateCcw className="h-4 w-4" aria-hidden />
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={props.onMinimize} aria-label={t.minimize} title={t.minimize}>
          <ChevronDown className="h-4 w-4" aria-hidden />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={props.onDismiss} aria-label={t.close} title={t.close}>
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </header>
  );

  // ---------------- Welcome ----------------
  if (!task) {
    const tasks: CompanionTask[] = ['jobs', 'cv', 'proposal', 'plan'];
    return (
      <section
        id={panelId}
        role="dialog"
        aria-modal={false}
        aria-labelledby={titleId}
        dir={dir}
        lang={s.lang}
        className={cn(
          'shaghol-panel-enter fixed z-[60] flex flex-col overflow-hidden border-ink-200 bg-white text-ink-900 shadow-elevated dark:border-ink-dark-border dark:bg-ink-dark-surface dark:text-ink-dark-text',
          isMobile ? 'inset-x-0 border-0' : 'bottom-6 right-6 w-[400px] rounded-2xl border'
        )}
        style={isMobile ? style : { maxHeight: 'calc(100dvh - 3rem)' }}
      >
        {header}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-4">
          <div className="flex items-center gap-3">
            <CompanionCharacter state={hero.pose} blink={hero.blink} frameSrc={hero.frameSrc} size={isMobile ? 84 : 96} label={t.name} />
            <div className="min-w-0">
              <p className="text-[17px] font-semibold leading-6 tracking-tight text-ink-900 dark:text-ink-dark-text">
                {isStudent ? t.panel.hello(props.firstName) : t.name}
              </p>
              <p className="mt-1 text-[13px] leading-5 text-ink-600 dark:text-ink-400">{isStudent ? t.panel.intro : t.guestGreeting}</p>
            </div>
          </div>

          {isGuest && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm"><Link to="/login" className="text-white hover:text-white" onClick={props.onMinimize}>{t.signIn}</Link></Button>
              <Button asChild size="sm" variant="outline"><Link to="/register" onClick={props.onMinimize}>{t.register}</Link></Button>
            </div>
          )}

          {isStudent && (
            <>
              <ul className="mt-4 grid grid-cols-2 gap-2">
                {tasks.map((k) => {
                  const Icon = TASK_ICONS[k];
                  const copy = t.panel.tasks[k];
                  return (
                    <li key={k} className="flex">
                    <button
                      type="button"
                      onClick={() => openTask(k)}
                      className="group flex min-h-[124px] w-full flex-col items-start gap-2 rounded-xl border border-ink-200 bg-white p-3 text-start shadow-soft transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-ink-dark-border dark:bg-white/[0.04] dark:hover:border-brand-500/40"
                    >
                      <span className={cn('grid h-8 w-8 place-items-center rounded-lg', TASK_TONES[k])}>
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="text-[13.5px] font-semibold leading-5 text-ink-900 dark:text-ink-dark-text">{copy.title}</span>
                      <span className="text-[12px] leading-4 text-ink-500 dark:text-ink-400">{copy.desc}</span>
                      <span className="mt-auto inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700 dark:text-brand-300">
                        {copy.action}
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden />
                      </span>
                    </button>
                    </li>
                  );
                })}
              </ul>

              {suggestion && (
                <button
                  type="button"
                  onClick={suggestion.run}
                  disabled={busy}
                  className="mt-3 flex w-full items-center gap-2 rounded-xl border border-dashed border-brand-200 bg-brand-50/60 px-3 py-2.5 text-start text-[12.5px] transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60 dark:border-brand-500/30 dark:bg-brand-500/10 dark:hover:bg-brand-500/15"
                >
                  <Sparkles className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">{t.panel.suggested}</span>
                    <span className="block truncate text-ink-800 dark:text-ink-100">{suggestion.label}</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-brand-600 rtl:-scale-x-100 dark:text-brand-300" aria-hidden />
                </button>
              )}

              {s.messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => go('chat')}
                  className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-start text-[12.5px] text-ink-600 transition-colors hover:bg-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-ink-300 dark:hover:bg-white/10"
                >
                  <MessageSquare className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="flex-1">{t.panel.continueChat(s.messages.length)}</span>
                  {busy && <span className="text-[11.5px] text-brand-700 dark:text-brand-300">{pendingLabel(t, s.pending)}</span>}
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 rtl:-scale-x-100" aria-hidden />
                </button>
              )}
            </>
          )}
        </div>
        {isStudent && (
          <footer className="shrink-0 border-t border-ink-200 px-3 pb-3 pt-2.5 dark:border-ink-dark-border">
            <Composer
              id={`${panelId}-home-input`}
              t={t}
              placeholder={t.panel.composer}
              disabled={busy}
              autoFocus={!isMobile}
              onSubmit={(text) => { go('chat'); send(text, 'chat', 'chat', { jobId: focusJob?.id || null }); }}
            />
          </footer>
        )}
      </section>
    );
  }

  // ---------------- Workspaces ----------------
  const Icon = TASK_ICONS[task];
  const recents = recentCards(s.messages).slice(0, 4);
  const prefs = s.jobPrefs;
  const setPrefs = (patch: Partial<JobPreferences>) => companionStore.set({ jobPrefs: { ...prefs, ...patch } });

  const controls = (() => {
    if (task === 'jobs') {
      return (
        <div className="space-y-2.5">
          {([
            ['type', t.panel.workType, [[null, t.panel.any], ['freelance', t.card.freelance], ['internship', t.card.internship]]],
            ['workMode', t.panel.workMode, [[null, t.panel.any], ['online', t.card.online], ['onsite', t.card.onsite], ['hybrid', t.card.hybrid]]],
            ['source', t.panel.listings, [[null, t.panel.any], ['internal', t.panel.internalOnly], ['external', t.panel.externalOnly]]],
          ] as const).map(([key, label, options]) => (
            <div key={key} role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
              <span className="w-[78px] shrink-0 text-[11.5px] font-semibold text-ink-500 dark:text-ink-400">{label}</span>
              {options.map(([value, text]) => (
                <Chip key={String(value)} active={prefs[key] === value} onClick={() => setPrefs({ [key]: value } as Partial<JobPreferences>)}>
                  {text}
                </Chip>
              ))}
            </div>
          ))}
          <form onSubmit={(e) => { e.preventDefault(); searchJobs(); }} className="flex gap-2">
            <label htmlFor={`${panelId}-jobq`} className="sr-only">{t.panel.jobsQuery}</label>
            <input
              id={`${panelId}-jobq`}
              value={s.jobQuery}
              maxLength={100}
              onChange={(e) => companionStore.set({ jobQuery: e.target.value })}
              placeholder={t.panel.jobsQuery}
              className="min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-3 py-2 text-[16px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-ink-dark-border dark:bg-white/[0.04] sm:text-[13px]"
            />
            <Button type="submit" size="sm" className="h-auto" disabled={busy}>{t.panel.findJobs}</Button>
          </form>
        </div>
      );
    }
    if (task === 'cv') {
      return (
        <form onSubmit={(e) => { e.preventDefault(); reviewCv(); }} className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor={`${panelId}-cv`} className="text-[12.5px] font-semibold">{t.cvTitle}</label>
            <span className={cn('font-mono text-[11px]', s.cvDraft.length > CV_LIMIT ? 'text-rose-600' : 'text-ink-500')}>
              {s.cvDraft.length.toLocaleString()}/{CV_LIMIT.toLocaleString()}
            </span>
          </div>
          <textarea
            id={`${panelId}-cv`}
            value={s.cvDraft}
            maxLength={CV_LIMIT}
            dir="auto"
            onChange={(e) => companionStore.set({ cvDraft: e.target.value })}
            placeholder={t.cvPlaceholder}
            rows={lastResult ? 3 : 6}
            className="w-full resize-y rounded-lg border border-ink-200 bg-white p-2.5 text-[13px] leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-ink-dark-border dark:bg-white/[0.04]"
          />
          <div className="flex flex-wrap items-center gap-2">
            {focusJob && (
              <span className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[11.5px] dark:bg-white/10">
                <span className="shrink-0 font-semibold">{t.cvTailored}</span>
                <span className="truncate">{focusJob.title}</span>
              </span>
            )}
            <Button type="submit" size="sm" className="ms-auto" disabled={!s.cvDraft.trim() || busy}>{t.cvSubmit}</Button>
          </div>
        </form>
      );
    }
    if (task === 'proposal') {
      const card = s.selectedJob?.card || recents.find((c) => c.id === focusJob?.id);
      return focusJob ? (
        <div className="space-y-2">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">{t.panel.selectedJob}</p>
          <div className="rounded-lg border border-ink-200 p-2.5 dark:border-ink-dark-border">
            <p dir="auto" className="text-[13.5px] font-semibold leading-5">{focusJob.title}</p>
            {card && (
              <p className="mt-0.5 text-[12px] text-ink-500 dark:text-ink-400">
                {[card.company, card.sourceType === 'external' ? t.card.external : t.card.internal, card.type ? t.card[card.type] : null].filter(Boolean).join(' · ')}
              </p>
            )}
            {card && card.missingVerifiedSkills.length > 0 && card.sourceType === 'internal' && (
              <p className="mt-1 text-[12px] text-amber-700 dark:text-amber-300">{t.caution({ code: 'missing_verified', skills: card.missingVerifiedSkills })}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={draftProposal} disabled={busy}>{lastResult ? t.panel.regenerate : t.panel.generateDraft}</Button>
            {s.selectedJob && (
              <Button size="sm" variant="ghost" onClick={() => companionStore.set({ selectedJob: null })}>{t.panel.clearJob}</Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[13px] font-semibold">{t.panel.noJob}</p>
          <p className="text-[12.5px] text-ink-500 dark:text-ink-400">{t.panel.noJobHint}</p>
          {recents.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">{t.panel.recentJobs}</p>
              {recents.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => companionStore.set({ selectedJob: { id: c.id, title: c.title, card: c } })}
                  className="flex w-full items-center gap-2 rounded-lg border border-ink-200 px-2.5 py-2 text-start text-[12.5px] hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-ink-dark-border dark:hover:bg-white/10"
                >
                  <span dir="auto" className="min-w-0 flex-1 truncate font-medium">{c.title}</span>
                  <span className="shrink-0 text-[11px] text-ink-500">{c.company}</span>
                </button>
              ))}
            </div>
          )}
          <Button size="sm" variant="outline" onClick={() => go('jobs')}>{t.panel.findJobsFirst}</Button>
        </div>
      );
    }
    if (task === 'plan') {
      return (
        <form onSubmit={(e) => { e.preventDefault(); buildPlan(); }} className="space-y-2">
          <label htmlFor={`${panelId}-goal`} className="text-[12.5px] font-semibold">{t.panel.planGoal}</label>
          <div className="flex gap-2">
            <input
              id={`${panelId}-goal`}
              value={s.planGoal}
              maxLength={300}
              dir="auto"
              onChange={(e) => companionStore.set({ planGoal: e.target.value })}
              placeholder={t.panel.planPlaceholder}
              className="min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-3 py-2 text-[16px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-ink-dark-border dark:bg-white/[0.04] sm:text-[13px]"
            />
            <Button type="submit" size="sm" className="h-auto" disabled={!s.planGoal.trim() || busy}>{t.panel.buildPlan}</Button>
          </div>
        </form>
      );
    }
    return null;
  })();

  const emptyCopy = task === 'jobs' ? t.panel.jobsEmpty : task === 'cv' ? t.panel.cvEmpty : task === 'plan' ? t.panel.planEmpty : null;

  return (
    <section
      id={panelId}
      role="dialog"
      aria-modal={false}
      aria-labelledby={titleId}
      dir={dir}
      lang={s.lang}
      className={cn(
        'shaghol-panel-enter fixed z-[60] flex flex-col overflow-hidden border-ink-200 bg-white text-ink-900 shadow-elevated dark:border-ink-dark-border dark:bg-ink-dark-surface dark:text-ink-dark-text',
        isMobile ? 'inset-x-0 border-0' : 'bottom-6 right-6 w-[420px] rounded-2xl border'
      )}
      style={isMobile ? style : { height: 'min(700px, calc(100dvh - 3rem))' }}
    >
      {header}
      <div ref={listRef} className="relative flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-3">
        {/* Working state: the character shows what it's doing. */}
        <div className="flex items-center gap-2.5">
          <CompanionCharacter state={working.pose} blink={working.blink} size={44} />
          <div className="min-w-0 flex-1" aria-live="polite">
            <p className="flex items-center gap-1.5 text-[12.5px] leading-5 text-ink-600 dark:text-ink-300">
              <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-md', TASK_TONES[task])}><Icon className="h-3 w-3" aria-hidden /></span>
              {busy && pendingHere ? pendingLabel(t, s.pending) : t.panel.tasks[task].desc}
            </p>
          </div>
        </div>

        {controls && <div className="mt-3 rounded-xl border border-ink-200 bg-ink-50/60 p-3 dark:border-ink-dark-border dark:bg-white/[0.03]">{controls}</div>}

        <div className="mt-3 space-y-4" aria-live="polite" aria-relevant="additions">
          {taskMessages.length === 0 && emptyCopy && !busy && (
            <p className="px-1 text-[12.5px] leading-5 text-ink-500 dark:text-ink-400">{emptyCopy}</p>
          )}
          {taskMessages.map((m, i) => (
            <div key={m.id} data-shaghol-msg data-role={m.role}>
              {m.role === 'user' && task !== 'chat' ? (
                <p dir="auto" className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">{m.content}</p>
              ) : (
                <MessageView message={m} t={t} handlers={handlers} isLast={i === taskMessages.length - 1} />
              )}
            </div>
          ))}
          {busy && pendingHere && (
            <div className="flex items-center gap-2 text-[12.5px] text-ink-500 dark:text-ink-400" role="status">
              <span className="shaghol-dots flex gap-1" aria-hidden>
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              </span>
              {pendingLabel(t, s.pending)}
            </div>
          )}
          {nextSteps.length > 0 && (
            <div className="border-t border-ink-200 pt-3 dark:border-ink-dark-border">
              <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">{t.panel.nextSteps}</p>
              <div className="flex flex-wrap gap-1.5">
                {nextSteps.map((n) => (
                  <Button key={n.key} size="sm" variant="soft" className="max-w-full" onClick={n.run}>
                    <span className="truncate">{n.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <footer className="shrink-0 border-t border-ink-200 px-3 pb-3 pt-2.5 dark:border-ink-dark-border">
        <Composer id={`${panelId}-${task}-input`} t={t} placeholder={t.panel.followUp} disabled={busy} onSubmit={followUp} />
      </footer>
    </section>
  );
}

