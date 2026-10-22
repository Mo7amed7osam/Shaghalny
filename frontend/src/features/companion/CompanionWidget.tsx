import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Languages, RotateCcw, SendHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/auth/AuthProvider';
import { CompanionCharacter } from './CompanionCharacter';
import { CompanionLauncher, type LauncherHandle } from './CompanionLauncher';
import { useLivingPose } from './useLivingPose';
import { MessageView, type CompanionCardHandlers } from './CompanionMessages';
import { abortCompanionRequest, fetchCompanionStatus, sendCompanionMessage } from './companionApi';
import { COMPANION_STRINGS, PAGE_ROUTES } from './companionI18n';
import { companionStore, storeProposalHandoff, useCompanion } from './companionStore';
import type { CompanionIntent, CompanionJobCard, CompanionMessage, CompanionState } from './types';
import './companion.css';

const CV_LIMIT = 15000;
const HIDDEN_ROUTES = [/^\/student\/ai-interview\//];

const pendingState: Record<CompanionIntent, CompanionState> = {
  chat: 'thinking',
  find_jobs: 'searching',
  review_cv: 'reviewing_cv',
  write_proposal: 'writing_proposal',
};

/** Keeps the panel above the on-screen keyboard on mobile browsers. */
function useVisualViewport(active: boolean) {
  const [vv, setVv] = useState<{ height: number; top: number } | null>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!active || !viewport) return;
    const update = () => setVv({ height: viewport.height, top: viewport.offsetTop });
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, [active]);
  return vv;
}

function useMedia(query: string) {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMobile(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return mobile;
}

export function CompanionWidget() {
  const { user, loading } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigate();
  const s = useCompanion((x) => x);
  const t = COMPANION_STRINGS[s.lang];
  const isMobile = useMedia('(max-width: 639px)');
  const hasTabBar = useMedia('(max-width: 767px)');
  const vv = useVisualViewport(s.open && isMobile);
  const panelId = useId();
  const titleId = useId();
  const launcherRef = useRef<LauncherHandle>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const cvRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState('');
  const [aiStatus, setAiStatus] = useState<{ aiConfigured: boolean; fallbackEnabled: boolean } | null>(null);
  const [greetingFlash, setGreetingFlash] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);
  const [greetKey, setGreetKey] = useState(0);

  const role = user?.role;
  const userId: string | null = user ? String(user._id || user.id) : null;
  const isStudent = role === 'Student';
  const isGuest = !loading && !user;

  // Bind private state to the signed-in account; logout or a different
  // account wipes the conversation, drafts and in-flight requests.
  useEffect(() => {
    if (loading) return;
    const owner = isStudent ? userId : null;
    if (!owner || companionStore.get().ownerId !== owner) {
      abortCompanionRequest();
      companionStore.setOwner(owner);
      setDraft('');
      setAiStatus(null);
    }
  }, [loading, isStudent, userId]);

  useEffect(() => {
    if (s.open && isStudent && !aiStatus) fetchCompanionStatus().then((st) => st && setAiStatus(st));
  }, [s.open, isStudent, aiStatus]);

  // Clear a one-shot success/error pose after a moment.
  useEffect(() => {
    if (!s.flash) return;
    const timer = setTimeout(() => companionStore.set({ flash: null }), s.flash === 'error' ? 2500 : 2200);
    return () => clearTimeout(timer);
  }, [s.flash]);

  // Wave once when the companion first appears on a page load.
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => setGreetKey((k) => k + 1), 900);
    return () => clearTimeout(timer);
  }, [loading]);

  // Temporary speech bubbles beside the character while the panel is closed:
  // a one-time hint, progress while working, and a nudge when results land.
  useEffect(() => {
    if (s.open || s.dismissed || s.greeted || loading) return;
    const timer = setTimeout(() => setBubble(t.peek), 2500);
    return () => clearTimeout(timer);
  }, [s.open, s.dismissed, s.greeted, loading, t.peek]);
  useEffect(() => {
    if (s.open || s.dismissed) return;
    if (s.pending) setBubble(s.pending === 'find_jobs' ? t.searching : s.pending === 'review_cv' ? t.reviewing : s.pending === 'write_proposal' ? t.writing : t.thinking);
    else if (s.flash === 'success') setBubble(t.ready);
  }, [s.open, s.dismissed, s.pending, s.flash, t]);
  useEffect(() => {
    if (!bubble || s.pending) return;
    const timer = setTimeout(() => setBubble(null), 7000);
    return () => clearTimeout(timer);
  }, [bubble, s.pending]);

  // Keep the newest turn in view: long answers (job cards, reviews) scroll to
  // their start rather than their end.
  useEffect(() => {
    if (!s.open) return;
    const el = listRef.current;
    if (!el) return;
    const items = el.querySelectorAll<HTMLElement>('[data-shaghol-msg]');
    const last = items[items.length - 1];
    if (!s.pending && last && last.dataset.role === 'assistant') el.scrollTop = Math.max(0, last.offsetTop - 12);
    else el.scrollTop = el.scrollHeight;
  }, [s.open, s.messages.length, s.pending]);

  useEffect(() => {
    if (!s.open) return;
    const id = requestAnimationFrame(() => (s.composer === 'cv' ? cvRef.current : inputRef.current)?.focus());
    return () => cancelAnimationFrame(id);
  }, [s.open, s.composer]);

  const charState: CompanionState = s.pending ? pendingState[s.pending] : s.flash || (greetingFlash ? 'greeting' : 'idle');
  const headerLife = useLivingPose(charState);
  const focusJob = s.selectedJob || s.pageJob;
  const demoActive = useMemo(() => {
    const lastAssistant = [...s.messages].reverse().find((m) => m.role === 'assistant' && m.response);
    if (lastAssistant) return lastAssistant.response?.mode === 'demo';
    return Boolean(aiStatus && !aiStatus.aiConfigured && aiStatus.fallbackEnabled);
  }, [s.messages, aiStatus]);

  const openPanel = useCallback(() => {
    setBubble(null);
    const firstOpen = !companionStore.get().greeted;
    companionStore.set({ open: true, dismissed: false, greeted: true });
    if (firstOpen) {
      setGreetingFlash(true);
      setTimeout(() => setGreetingFlash(false), 1600);
    }
  }, []);

  const minimize = useCallback(() => {
    companionStore.set({ open: false });
    requestAnimationFrame(() => launcherRef.current?.focus());
  }, []);

  const dismiss = useCallback(() => {
    setBubble(null);
    companionStore.set({ open: false, dismissed: true });
  }, []);

  useEffect(() => {
    if (!s.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') minimize();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [s.open, minimize]);

  const send = useCallback(
    (text: string, intent: CompanionIntent = 'chat', extra: { jobId?: string | null; cvText?: string | null; displayText?: string } = {}) => {
      const trimmed = text.trim();
      if (!trimmed || companionStore.get().pending) return;
      sendCompanionMessage(
        { text: trimmed, intent, jobId: extra.jobId ?? null, cvText: extra.cvText ?? null },
        { displayText: extra.displayText }
      );
    },
    []
  );

  const startFindJobs = () => send(t.starters.findJobs, 'find_jobs');
  const startCv = (job?: { id: string; title: string } | null) => {
    companionStore.set({ composer: 'cv', ...(job ? { selectedJob: job } : {}) });
  };
  const startProposal = (job?: { id: string; title: string } | null) => {
    const target = job || focusJob;
    send(target ? t.proposalUserMessage(target.title) : t.starters.writeProposal, 'write_proposal', { jobId: target?.id || null });
  };

  const submitCv = () => {
    const text = s.cvDraft.trim();
    if (!text) return;
    const job = s.selectedJob || s.pageJob;
    const display = t.cvUserMessage(text.length, job?.title);
    send(display, 'review_cv', { cvText: text, jobId: job?.id || null, displayText: display });
    companionStore.set({ composer: 'chat', cvDraft: '' });
  };

  const submitDraft = () => {
    if (!draft.trim()) return;
    send(draft, 'chat', { jobId: focusJob?.id || null });
    setDraft('');
  };

  // Opening the apply sheet hides the panel so the existing form has room.
  const goTo = (path: string, { keepOpen = !isMobile } = {}) => {
    navigate(path);
    if (!keepOpen) minimize();
  };

  const handlers: CompanionCardHandlers = {
    selectedJobId: s.selectedJob?.id || null,
    onViewApply: (card: CompanionJobCard) => goTo(`${PAGE_ROUTES.jobs}?apply=${encodeURIComponent(card.id)}`, { keepOpen: false }),
    onSelect: (card) =>
      companionStore.set((st) => ({ selectedJob: st.selectedJob?.id === card.id ? null : { id: card.id, title: card.title } })),
    onProposal: (card) => {
      companionStore.set({ selectedJob: { id: card.id, title: card.title } });
      startProposal({ id: card.id, title: card.title });
    },
    onTailorCv: (card) => startCv({ id: card.id, title: card.title }),
    onUseProposal: (card, _draft, text) => {
      if (!card) return;
      storeProposalHandoff(card.id, text);
      goTo(`${PAGE_ROUTES.jobs}?apply=${encodeURIComponent(card.id)}`, { keepOpen: false });
    },
    onOpenPage: (page) => goTo(PAGE_ROUTES[page]),
    onRetry: (message: CompanionMessage) => {
      if (!message.request) return;
      sendCompanionMessage(message.request, { retryOf: message.id });
    },
  };

  // Starter actions adapt to the current page and selected job.
  const starters = useMemo(() => {
    const items: { key: string; label: string; run: () => void }[] = [
      { key: 'jobs', label: t.starters.findJobs, run: startFindJobs },
      { key: 'cv', label: t.starters.reviewCv, run: () => startCv() },
      { key: 'proposal', label: t.starters.writeProposal, run: () => startProposal() },
    ];
    const path = location.pathname;
    if (focusJob) items.push({ key: 'missing', label: t.starters.missing, run: () => send(t.starters.missing, 'chat', { jobId: focusJob.id }) });
    else if (path.startsWith('/student/skill-verification')) items.push({ key: 'verify', label: t.starters.verification, run: () => send(t.starters.verification) });
    else if (path.startsWith('/student/profile')) items.push({ key: 'profile', label: t.starters.profile, run: () => send(t.starters.profile) });
    else if (path.startsWith('/student/career-roadmap') || path.startsWith('/student/dashboard')) items.push({ key: 'roadmap', label: t.starters.roadmap, run: () => send(t.starters.roadmap) });
    if (path.startsWith('/student/profile')) items.unshift(items.splice(1, 1)[0]);
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, location.pathname, focusJob?.id]);

  const hidden = (!isStudent && !isGuest) || HIDDEN_ROUTES.some((re) => re.test(location.pathname));
  if (hidden) return null;

  const dir = s.lang === 'ar' ? 'rtl' : 'ltr';
  const pendingLabel = s.pending === 'find_jobs' ? t.searching : s.pending === 'review_cv' ? t.reviewing : s.pending === 'write_proposal' ? t.writing : t.thinking;

  return (
    <>
      {!s.open && (
        <CompanionLauncher
          ref={launcherRef}
          t={t}
          dir={dir}
          state={charState}
          size={isMobile ? 76 : 92}
          bottomInset={isStudent && hasTabBar ? 76 : 0}
          dismissed={s.dismissed}
          bubble={bubble}
          greetKey={greetKey}
          panelId={panelId}
          onOpen={openPanel}
          onHide={dismiss}
          onRestore={() => companionStore.set({ dismissed: false })}
          onBubbleDismiss={() => {
            setBubble(null);
            companionStore.set({ greeted: true });
          }}
        />
      )}

      {s.open && (
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
          style={
            isMobile
              ? { top: vv?.top ?? 0, height: vv?.height ?? '100dvh', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }
              : { height: 'min(680px, calc(100dvh - 3rem))' }
          }
        >
          <header className="flex items-center gap-3 border-b border-ink-200 px-3 py-2.5 dark:border-ink-dark-border">
            <CompanionCharacter state={headerLife.pose} blink={headerLife.blink} size={52} />
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="flex items-center gap-2 text-[15px] font-semibold leading-5">
                {t.name}
                {demoActive && isStudent && (
                  <span className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">{t.demoBadge}</span>
                )}
              </h2>
              <p className="truncate text-[12px] leading-5 text-ink-500 dark:text-ink-400" aria-live="polite">
                {s.pending ? pendingLabel : t.tagline}
              </p>
            </div>
            <div className="flex items-center gap-0.5">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => companionStore.setLang(s.lang === 'ar' ? 'en' : 'ar')} aria-label={t.languageLabel} title={t.languageLabel}>
                <Languages className="h-4 w-4" aria-hidden />
              </Button>
              {isStudent && s.messages.length > 0 && (
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { abortCompanionRequest(); companionStore.resetConversation(); requestAnimationFrame(() => inputRef.current?.focus()); }} aria-label={t.newChat} title={t.newChat}>
                  <RotateCcw className="h-4 w-4" aria-hidden />
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={minimize} aria-label={t.minimize} title={t.minimize}>
                <ChevronDown className="h-4 w-4" aria-hidden />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={dismiss} aria-label={t.close} title={t.close}>
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </header>

          <div ref={listRef} className="relative flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3" aria-live="polite" aria-relevant="additions">
            <div className="max-w-[95%] rounded-2xl rounded-ss-md bg-ink-100 px-3 py-2 text-[13.5px] leading-6 dark:bg-white/[0.07]">
              {isStudent ? t.greeting : t.guestGreeting}
            </div>
            {isGuest && (
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm"><Link to="/login" className="text-white hover:text-white" onClick={minimize}>{t.signIn}</Link></Button>
                <Button asChild size="sm" variant="outline"><Link to="/register" onClick={minimize}>{t.register}</Link></Button>
              </div>
            )}
            {isStudent && s.messages.map((m, i) => (
              <div key={m.id} data-shaghol-msg data-role={m.role}>
                <MessageView message={m} t={t} handlers={handlers} isLast={i === s.messages.length - 1} />
              </div>
            ))}
            {s.pending && (
              <div className="flex items-center gap-2 text-[12.5px] text-ink-500 dark:text-ink-400" role="status">
                <span className="shaghol-dots flex gap-1" aria-hidden>
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                </span>
                {pendingLabel}
              </div>
            )}
          </div>

          {isStudent && (
            <footer className="border-t border-ink-200 px-3 pb-3 pt-2 dark:border-ink-dark-border">
              {!s.pending && s.composer === 'chat' && (
                <div className={cn('shaghol-chips mb-2 flex gap-1.5', s.messages.length ? '-mx-3 overflow-x-auto px-3' : 'flex-wrap')} role="group" aria-label="Suggestions">
                  {starters.map((st) => (
                    <button
                      key={st.key}
                      type="button"
                      onClick={st.run}
                      className="shrink-0 rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-start text-[12.5px] font-medium text-brand-700 transition-colors hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-brand-500/25 dark:bg-brand-500/15 dark:text-brand-200 dark:hover:bg-brand-500/25"
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              )}

              {focusJob && s.composer === 'chat' && (
                <div className="mb-2 flex items-center gap-2 rounded-lg bg-ink-100 px-2 py-1 text-[12px] dark:bg-white/[0.06]">
                  <span className="font-semibold text-ink-600 dark:text-ink-300">{t.selectedJob}:</span>
                  <span className="min-w-0 flex-1 truncate">{focusJob.title}</span>
                  {s.selectedJob && (
                    <button type="button" onClick={() => companionStore.set({ selectedJob: null })} className="rounded p-0.5 text-ink-500 hover:text-ink-800 dark:hover:text-ink-100" aria-label={t.clearSelection}>
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  )}
                </div>
              )}

              {s.composer === 'cv' ? (
                <form
                  onSubmit={(e) => { e.preventDefault(); submitCv(); }}
                  className="space-y-2"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <label htmlFor={`${panelId}-cv`} className="text-[13px] font-semibold">{t.cvTitle}</label>
                    <span className={cn('font-mono text-[11px]', s.cvDraft.length > CV_LIMIT ? 'text-rose-600' : 'text-ink-500')}>
                      {s.cvDraft.length.toLocaleString()}/{CV_LIMIT.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[11.5px] leading-5 text-ink-500 dark:text-ink-400">
                    {t.cvHint}{focusJob ? ` ${t.cvTailored} “${focusJob.title}”.` : ''}
                  </p>
                  <textarea
                    id={`${panelId}-cv`}
                    ref={cvRef}
                    value={s.cvDraft}
                    maxLength={CV_LIMIT}
                    onChange={(e) => companionStore.set({ cvDraft: e.target.value })}
                    placeholder={t.cvPlaceholder}
                    rows={isMobile ? 6 : 8}
                    className="w-full resize-none rounded-xl border border-ink-200 bg-ink-50 p-2.5 text-[13px] leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-ink-dark-border dark:bg-white/[0.04]"
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => companionStore.set({ composer: 'chat' })}>{t.cvCancel}</Button>
                    <Button type="submit" size="sm" disabled={!s.cvDraft.trim() || Boolean(s.pending)}>{t.cvSubmit}</Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); submitDraft(); }} className="flex items-end gap-2">
                  <label htmlFor={`${panelId}-input`} className="sr-only">{t.inputLabel}</label>
                  <textarea
                    id={`${panelId}-input`}
                    ref={inputRef}
                    value={draft}
                    maxLength={4000}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        submitDraft();
                      }
                    }}
                    rows={1}
                    placeholder={t.inputPlaceholder}
                    className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-ink-200 bg-ink-50 px-3 py-2.5 text-[16px] leading-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-ink-dark-border dark:bg-white/[0.04] sm:text-[13.5px]"
                  />
                  <Button type="submit" size="icon" className="h-[42px] w-[42px] shrink-0 rounded-xl" disabled={!draft.trim() || Boolean(s.pending)} aria-label={t.send}>
                    <SendHorizontal className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
                  </Button>
                </form>
              )}
            </footer>
          )}
        </section>
      )}
    </>
  );
}

export default CompanionWidget;
