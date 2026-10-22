import { useSyncExternalStore } from 'react';
import type { CompanionIntent, CompanionLang, CompanionMessage, CompanionState } from './types';

/**
 * Module-level store so the conversation survives route changes. Private
 * state is persisted per user in sessionStorage and wiped on logout or when a
 * different account signs in.
 */
export interface CompanionStoreState {
  ownerId: string | null;
  open: boolean;
  dismissed: boolean;
  messages: CompanionMessage[];
  pending: CompanionIntent | null;
  selectedJob: { id: string; title: string } | null;
  pageJob: { id: string; title: string } | null;
  composer: 'chat' | 'cv';
  cvDraft: string;
  lang: CompanionLang;
  flash: CompanionState | null;
  greeted: boolean;
}

const SESSION_PREFIX = 'shaghol:v1:';
const LANG_KEY = 'shaghol:lang';
export const PROPOSAL_HANDOFF_PREFIX = 'shaghol:proposal:';
const MAX_STORED_MESSAGES = 40;

const safe = <T,>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

const initialLang = (): CompanionLang =>
  safe(() => {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'ar' || saved === 'en') return saved;
    return navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  }, 'en');

const blank = (lang: CompanionLang, ownerId: string | null): CompanionStoreState => ({
  ownerId,
  open: false,
  dismissed: false,
  messages: [],
  pending: null,
  selectedJob: null,
  pageJob: null,
  composer: 'chat',
  cvDraft: '',
  lang,
  flash: null,
  greeted: false,
});

let state: CompanionStoreState = blank(initialLang(), null);
const listeners = new Set<() => void>();
// Bumped on every owner reset so late responses from a previous account are dropped.
let generation = 0;

const persist = () => {
  if (!state.ownerId) return;
  // CV drafts are never persisted; only the visible conversation is.
  const snapshot = {
    open: state.open,
    dismissed: state.dismissed,
    greeted: state.greeted,
    selectedJob: state.selectedJob,
    messages: state.messages.slice(-MAX_STORED_MESSAGES),
  };
  safe(() => sessionStorage.setItem(SESSION_PREFIX + state.ownerId, JSON.stringify(snapshot)), undefined);
};

const emit = () => listeners.forEach((l) => l());

export const companionStore = {
  get: () => state,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  set(patch: Partial<CompanionStoreState> | ((s: CompanionStoreState) => Partial<CompanionStoreState>)) {
    const next = typeof patch === 'function' ? patch(state) : patch;
    state = { ...state, ...next };
    persist();
    emit();
  },
  generation: () => generation,

  /** Switch to `ownerId` (null for guests), clearing everything private. */
  setOwner(ownerId: string | null) {
    // Signed out (including a reload after the token was removed): no private
    // companion data may survive in this tab.
    if (!ownerId) clearAllSessions();
    if (state.ownerId === ownerId) return;
    generation += 1;
    const restored = ownerId
      ? safe(() => JSON.parse(sessionStorage.getItem(SESSION_PREFIX + ownerId) || 'null'), null)
      : null;
    state = {
      ...blank(state.lang, ownerId),
      ...(restored && Array.isArray(restored.messages)
        ? {
            open: Boolean(restored.open),
            dismissed: Boolean(restored.dismissed),
            greeted: Boolean(restored.greeted),
            selectedJob: restored.selectedJob || null,
            messages: restored.messages,
          }
        : {}),
    };
    emit();
  },

  setLang(lang: CompanionLang) {
    safe(() => localStorage.setItem(LANG_KEY, lang), undefined);
    companionStore.set({ lang });
  },

  resetConversation() {
    generation += 1;
    companionStore.set({ messages: [], pending: null, composer: 'chat', cvDraft: '', selectedJob: null, flash: null });
  },
};

export function clearAllSessions() {
  safe(() => {
    for (const store of [sessionStorage]) {
      Object.keys(store)
        .filter((k) => k.startsWith(SESSION_PREFIX) || k.startsWith(PROPOSAL_HANDOFF_PREFIX))
        .forEach((k) => store.removeItem(k));
    }
  }, undefined);
}

export function useCompanion<T>(selector: (s: CompanionStoreState) => T): T {
  return useSyncExternalStore(companionStore.subscribe, () => selector(companionStore.get()));
}

/** Lets pages (e.g. the Job Board) tell the companion which job is open. */
export function setCompanionPageJob(job: { id: string; title: string } | null) {
  const current = companionStore.get().pageJob;
  if (current?.id === job?.id) return;
  companionStore.set({ pageJob: job });
}

/** Proposal text handed from the companion to the Job Board apply form. */
export function takeProposalHandoff(jobId: string): string | null {
  return safe(() => {
    const key = PROPOSAL_HANDOFF_PREFIX + jobId;
    const value = sessionStorage.getItem(key);
    if (value !== null) sessionStorage.removeItem(key);
    return value;
  }, null);
}

export function storeProposalHandoff(jobId: string, text: string) {
  safe(() => sessionStorage.setItem(PROPOSAL_HANDOFF_PREFIX + jobId, text.slice(0, 5000)), undefined);
}
