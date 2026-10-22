import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/auth/AuthProvider';
import { CompanionLauncher, type LauncherHandle } from './CompanionLauncher';
import { CompanionPanel, type SendOptions } from './CompanionPanel';
import { type CompanionCardHandlers } from './CompanionMessages';
import { abortCompanionRequest, fetchCompanionStatus, sendCompanionMessage } from './companionApi';
import { COMPANION_STRINGS, PAGE_ROUTES } from './companionI18n';
import { companionStore, storeProposalHandoff, useCompanion } from './companionStore';
import type { CompanionIntent, CompanionJobCard, CompanionMessage, CompanionState, CompanionTask } from './types';
import './companion.css';

const HIDDEN_ROUTES = [/^\/student\/ai-interview\//];

const pendingState: Record<CompanionIntent, CompanionState> = {
  chat: 'thinking',
  find_jobs: 'searching',
  review_cv: 'reviewing_cv',
  write_proposal: 'writing_proposal',
  plan_career: 'thinking',
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
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatch(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);
  return match;
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
  const [aiStatus, setAiStatus] = useState<{ aiConfigured: boolean; fallbackEnabled: boolean } | null>(null);
  const [panelGreet, setPanelGreet] = useState(0);
  const [bubble, setBubble] = useState<string | null>(null);
  const [greetKey, setGreetKey] = useState(0);

  const role = user?.role;
  const userId: string | null = user ? String(user._id || user.id) : null;
  const isStudent = role === 'Student';
  const isGuest = !loading && !user;
  const firstName = typeof user?.name === 'string' ? user.name.split(/\s+/)[0] : undefined;

  // Bind private state to the signed-in account; logout or a different
  // account wipes the conversation, drafts and in-flight requests.
  useEffect(() => {
    if (loading) return;
    const owner = isStudent ? userId : null;
    if (!owner || companionStore.get().ownerId !== owner) {
      abortCompanionRequest();
      companionStore.setOwner(owner);
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
    if (s.pending) {
      setBubble(
        s.pending === 'find_jobs' ? t.searching : s.pending === 'review_cv' ? t.reviewing : s.pending === 'write_proposal' ? t.writing : s.pending === 'plan_career' ? t.panel.planning : t.thinking
      );
    } else if (s.flash === 'success') setBubble(t.ready);
  }, [s.open, s.dismissed, s.pending, s.flash, t]);
  useEffect(() => {
    if (!bubble || s.pending) return;
    const timer = setTimeout(() => setBubble(null), 7000);
    return () => clearTimeout(timer);
  }, [bubble, s.pending]);

  const charState: CompanionState = s.pending ? pendingState[s.pending] : s.flash || 'idle';
  const demoActive = useMemo(() => {
    const lastAssistant = [...s.messages].reverse().find((m) => m.role === 'assistant' && m.response);
    if (lastAssistant) return lastAssistant.response?.mode === 'demo';
    return Boolean(aiStatus && !aiStatus.aiConfigured && aiStatus.fallbackEnabled);
  }, [s.messages, aiStatus]);

  const openPanel = useCallback(() => {
    setBubble(null);
    const firstOpen = !companionStore.get().greeted;
    companionStore.set({ open: true, dismissed: false, greeted: true });
    // Wave hello the first time the panel opens.
    if (firstOpen) setPanelGreet((k) => k + 1);
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

  const send = useCallback((text: string, intent: CompanionIntent, task: CompanionTask, extra: SendOptions = {}) => {
    const trimmed = text.trim();
    if (!trimmed || companionStore.get().pending) return;
    sendCompanionMessage(
      { text: trimmed, intent, task, jobId: extra.jobId ?? null, cvText: extra.cvText ?? null, preferences: extra.preferences ?? null },
      { displayText: extra.displayText }
    );
  }, []);

  // Opening the apply sheet hides the panel so the existing form has room.
  const goTo = (path: string, { keepOpen = !isMobile } = {}) => {
    navigate(path);
    if (!keepOpen) minimize();
  };

  const selectCard = (card: CompanionJobCard) => companionStore.set({ selectedJob: { id: card.id, title: card.title, card } });

  const handlers: CompanionCardHandlers = {
    selectedJobId: s.selectedJob?.id || null,
    onViewApply: (card) => goTo(`${PAGE_ROUTES.jobs}?apply=${encodeURIComponent(card.id)}`, { keepOpen: false }),
    onSelect: (card) =>
      companionStore.set((st) => ({ selectedJob: st.selectedJob?.id === card.id ? null : { id: card.id, title: card.title, card } })),
    onProposal: (card) => {
      selectCard(card);
      companionStore.set({ view: 'proposal' });
      send(t.proposalUserMessage(card.title), 'write_proposal', 'proposal', { jobId: card.id });
    },
    onTailorCv: (card) => {
      selectCard(card);
      companionStore.set({ view: 'cv' });
    },
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
    proposalText: (id, original) => s.proposalEdits[id] ?? original,
    onProposalEdit: (id, text) => companionStore.set((st) => ({ proposalEdits: { ...st.proposalEdits, [id]: text } })),
  };

  const hidden = (!isStudent && !isGuest) || HIDDEN_ROUTES.some((re) => re.test(location.pathname));
  if (hidden) return null;

  const dir = s.lang === 'ar' ? 'rtl' : 'ltr';

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
        <CompanionPanel
          s={s}
          t={t}
          dir={dir}
          isMobile={isMobile}
          isStudent={isStudent}
          isGuest={isGuest}
          firstName={firstName}
          panelId={panelId}
          titleId={titleId}
          style={{ top: vv?.top ?? 0, height: vv?.height ?? '100dvh', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
          charState={charState}
          greetKey={panelGreet}
          demoActive={demoActive}
          pathname={location.pathname}
          handlers={handlers}
          send={send}
          onMinimize={minimize}
          onDismiss={dismiss}
          onNewChat={() => {
            abortCompanionRequest();
            companionStore.resetConversation();
          }}
          onGoJobBoard={() => goTo(PAGE_ROUTES.jobs)}
        />
      )}
    </>
  );
}

export default CompanionWidget;
