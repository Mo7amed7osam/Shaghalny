import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';

import { draftJobBrief, type JobBriefDraft } from '@/services/api';
import { Button } from '@/components/ui/button';

const EXAMPLES = [
  'Logo and social media kit for a new coffee shop in Maadi',
  'Translate our 20-page app help center from English to Arabic',
  'React landing page for a student tutoring startup',
];

/** One-line idea in, full job post out. The client reviews every field before posting. */
export function AiJobBriefCard({ onDraft }: { onDraft: (draft: JobBriefDraft) => void }) {
  const { t } = useI18n();
  const [idea, setIdea] = useState('');
  const mutation = useMutation({
    mutationFn: draftJobBrief,
    onSuccess: (draft) => {
      onDraft(draft);
      toast.success(t('Draft ready. Review every field before posting.'));
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || t('The AI writer is unavailable right now.')),
  });
  const submit = () => {
    const text = idea.trim();
    if (text.length < 8) {
      toast.error(t('Describe the job in a few more words.'));
      return;
    }
    mutation.mutate(text);
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-brand-200/70 bg-gradient-to-br from-brand-50 via-white to-violet-50 p-5 dark:border-brand-500/25 dark:from-brand-500/10 dark:via-transparent dark:to-violet-500/10">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-sm">
          <Wand2 size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-ink-900 dark:text-white">{t('Write it with Shaghol AI')}</h2>
          <p className="text-sm text-ink-600 dark:text-ink-300">{t('Describe what you need in one line. AI drafts the title, description, skills, budget and duration.')}</p>
        </div>
      </div>

      <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <label htmlFor="ai-job-idea" className="sr-only">{t('Describe the job')}</label>
        <input
          id="ai-job-idea"
          value={idea}
          maxLength={500}
          onChange={(e) => setIdea(e.target.value)}
          placeholder={t('e.g. I need a 30-second promo video for our app launch')}
          className="h-11 flex-1 rounded-xl border border-ink-200 bg-white px-3.5 text-sm text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-ink-dark-border dark:bg-white/[0.06] dark:text-white dark:focus:ring-brand-500/20"
        />
        <Button type="submit" className="h-11 gap-1.5" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {t(mutation.isPending ? 'Drafting…' : 'Draft job')}
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setIdea(t(example))}
            className="rounded-full border border-ink-200 bg-white/70 px-2.5 py-1 text-xs text-ink-600 transition hover:border-brand-300 hover:text-brand-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-ink-300 dark:hover:text-brand-200"
          >
            {t(example)}
          </button>
        ))}
      </div>
    </section>
  );
}
