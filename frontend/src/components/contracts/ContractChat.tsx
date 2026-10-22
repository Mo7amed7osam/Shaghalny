import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageSquare, SendHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';

import { sendContractMessage } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { UserAvatar } from '@/components/ui/user-avatar';
import { cn } from '@/lib/utils';

interface ChatMessage {
  _id: string;
  senderId: string;
  senderRole: 'Client' | 'Student';
  message: string;
  createdAt?: string;
  pending?: boolean;
}

interface ContractChatProps {
  contractId: string;
  currentUserId?: string;
  client?: { _id?: string; name?: string; profilePhotoUrl?: string; companyLogoUrl?: string };
  student?: { _id?: string; name?: string; profilePhotoUrl?: string };
  messages: ChatMessage[];
}

const timeLabel = (value?: string, lang: string = 'en') => {
  const locale = lang === 'ar' ? 'ar-EG' : undefined;
  if (!value) return '';
  const date = new Date(value);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/** Live chat between the two contract parties. New messages arrive by polling the contract query. */
export function ContractChat({ contractId, currentUserId, client, student, messages }: ContractChatProps) {
  const queryClient = useQueryClient();
  const { t, lang } = useI18n();
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  const all = [...messages, ...pending];

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [all.length]);

  const sendMutation = useMutation({
    mutationFn: (text: string) => sendContractMessage(contractId, text),
    onMutate: (text) => {
      const temp: ChatMessage = {
        _id: `pending-${Date.now()}`, senderId: currentUserId || '', senderRole: 'Student', message: text,
        createdAt: new Date().toISOString(), pending: true,
      };
      setPending((p) => [...p, temp]);
      setDraft('');
      return temp._id;
    },
    onSettled: async (_data, _error, _text, tempId) => {
      await queryClient.invalidateQueries({ queryKey: ['contracts', contractId] });
      setPending((p) => p.filter((m) => m._id !== tempId));
    },
    onError: (error: any, text) => {
      setDraft(text);
      toast.error(error?.response?.data?.message || t('Failed to send message.'));
    },
  });

  const send = () => {
    const text = draft.trim();
    if (!text || sendMutation.isPending) return;
    sendMutation.mutate(text);
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center gap-3 border-b border-ink-100 px-4 py-3 dark:border-ink-dark-border">
          <MessageSquare size={18} className="text-brand-600 dark:text-brand-300" />
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{t('Messages')}</h2>
            <p className="text-xs text-ink-500 dark:text-ink-300">{t('Updates live while this page is open.')}</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-accent-600 dark:text-accent-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent-500" aria-hidden="true" /> {t('Live')}
          </span>
        </div>

        <div ref={listRef} className="max-h-[420px] min-h-[220px] space-y-3 overflow-y-auto px-4 py-4" aria-live="polite" aria-label={t('Contract messages')}>
          {all.length === 0 ? (
            <div className="flex h-[180px] flex-col items-center justify-center text-center">
              <MessageSquare size={28} className="mb-2 text-ink-300" />
              <p className="text-sm font-medium text-ink-700 dark:text-ink-200">{t('No messages yet')}</p>
              <p className="text-xs text-ink-500">{t('Say hello, share a meeting link or agree on the next step.')}</p>
            </div>
          ) : (
            all.map((msg) => {
              const mine = String(msg.senderId) === String(currentUserId);
              const sender = msg.senderRole === 'Client' ? client : student;
              return (
                <div key={msg._id} className={cn('flex items-end gap-2', mine ? 'flex-row-reverse' : 'flex-row')}>
                  <UserAvatar user={sender} className="h-7 w-7" fallbackClassName="text-[10px]" />
                  <div className={cn('max-w-[78%]', mine ? 'items-end text-end' : 'items-start')}>
                    <div
                      dir="auto"
                      className={cn(
                        'whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-start text-sm',
                        mine
                          ? 'rounded-ee-md bg-brand-600 text-white'
                          : 'rounded-es-md bg-ink-100 text-ink-800 dark:bg-white/10 dark:text-ink-100',
                        msg.pending && 'opacity-60'
                      )}
                    >
                      {msg.message}
                    </div>
                    <p className="mt-1 px-1 text-[10.5px] text-ink-500">
                      {mine ? t('You') : sender?.name || t(msg.senderRole)} · {msg.pending ? t('Sending…') : timeLabel(msg.createdAt, lang)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form
          className="flex items-end gap-2 border-t border-ink-100 p-3 dark:border-ink-dark-border"
          onSubmit={(e) => { e.preventDefault(); send(); }}
        >
          <label htmlFor="contract-chat-input" className="sr-only">{t('Message')}</label>
          <textarea
            id="contract-chat-input"
            rows={1}
            maxLength={2000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
            }}
            placeholder={t('Write a message… (Enter to send, Shift+Enter for a new line)')}
            className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-ink-dark-border dark:bg-white/[0.06] dark:text-white dark:focus:ring-brand-500/20"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sendMutation.isPending}
            aria-label={t('Send message')}
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40"
          >
            {sendMutation.isPending ? <Loader2 size={17} className="animate-spin" /> : <SendHorizontal size={17} className="rtl:-scale-x-100" />}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
