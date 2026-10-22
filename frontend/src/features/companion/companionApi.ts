import http from '@/api/http';
import { companionStore } from './companionStore';
import { COMPANION_STRINGS } from './companionI18n';
import type { CompanionMessage, CompanionRequestInput, CompanionResponse } from './types';

const HISTORY_LIMIT = 12;

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// Assistant turns carry a short note about the cards shown so follow-ups such
// as "write a proposal for the first one" can refer to real job ids.
const toHistory = (messages: CompanionMessage[]) =>
  messages
    .filter((m) => !m.error && m.content.trim())
    .slice(-HISTORY_LIMIT)
    .map((m) => {
      const cards = m.response?.cards || [];
      const note = cards.length
        ? `\n[Job cards shown: ${cards.map((c, i) => `${i + 1}) ${c.title} (id ${c.id})`).join('; ')}]`
        : '';
      return { role: m.role, content: (m.content + note).slice(0, 4000) };
    });

const errorFor = (error: any): { message: string; retryable: boolean } => {
  const t = COMPANION_STRINGS[companionStore.get().lang];
  const status = error?.response?.status;
  const code = error?.response?.data?.code;
  if (!error?.response) return { message: t.errorNetwork, retryable: true };
  if (code === 'not_configured') return { message: t.errorNotConfigured, retryable: false };
  if (status === 429) return { message: t.errorRate, retryable: true };
  if (status === 400 && error.response.data?.message) return { message: String(error.response.data.message), retryable: false };
  return { message: t.errorGeneric, retryable: error.response.data?.retryable !== false };
};

let inflight: AbortController | null = null;

/**
 * Sends one turn. `retryOf` replaces a failed assistant turn instead of adding
 * a new user message.
 */
export async function sendCompanionMessage(input: CompanionRequestInput, options: { retryOf?: string; displayText?: string } = {}) {
  const store = companionStore;
  const startGen = store.generation();
  const { lang, messages } = store.get();
  if (store.get().pending) return;

  let base = messages;
  if (options.retryOf) {
    base = messages.filter((m) => m.id !== options.retryOf);
  } else {
    base = [...messages, { id: newId(), role: 'user', content: options.displayText || input.text, createdAt: Date.now(), intent: input.intent }];
  }
  store.set({ messages: base, pending: input.intent, flash: null });

  inflight?.abort();
  const controller = new AbortController();
  inflight = controller;

  const history = toHistory(base);
  // The API expects the actual request text as the final user message.
  if (history.length && history[history.length - 1].role === 'user') history[history.length - 1].content = input.text;

  try {
    const { data } = await http.post<CompanionResponse>(
      '/companion/chat',
      {
        messages: history,
        intent: input.intent,
        lang,
        jobId: input.jobId || undefined,
        cvText: input.cvText || undefined,
        context: { path: window.location.pathname, jobId: store.get().pageJob?.id || undefined },
      },
      { signal: controller.signal, timeout: 90000 }
    );
    if (store.generation() !== startGen) return;
    const { reply, ...response } = data;
    const produced = Boolean(response.cards?.length || response.cvReview || response.proposal);
    store.set((s) => ({
      pending: null,
      flash: produced ? 'success' : null,
      composer: response.needs === 'cv_text' ? 'cv' : s.composer,
      messages: [
        ...s.messages,
        { id: newId(), role: 'assistant', content: reply, createdAt: Date.now(), intent: input.intent, response, request: input },
      ],
    }));
  } catch (error: any) {
    if (controller.signal.aborted || store.generation() !== startGen) return;
    const err = errorFor(error);
    store.set((s) => ({
      pending: null,
      flash: 'error',
      messages: [
        ...s.messages,
        { id: newId(), role: 'assistant', content: '', createdAt: Date.now(), intent: input.intent, error: err, request: input },
      ],
    }));
  } finally {
    if (inflight === controller) inflight = null;
  }
}

export function abortCompanionRequest() {
  inflight?.abort();
  inflight = null;
}

export async function fetchCompanionStatus(): Promise<{ aiConfigured: boolean; fallbackEnabled: boolean } | null> {
  try {
    const { data } = await http.get('/companion/status');
    return data;
  } catch {
    return null;
  }
}
