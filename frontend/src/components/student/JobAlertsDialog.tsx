import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';

import { getJobAlerts, updateJobAlerts, type JobAlerts } from '@/services/api';
import { getCategoryMeta } from '@/lib/skillCategories';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const FALLBACK_CATEGORIES = ['Programming', 'Design', 'Business', 'Engineering', 'Media', 'Translation', 'Other'];

/** Students choose categories/keywords and get a notification when matching jobs appear. */
export function JobAlertsDialog() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<JobAlerts>({ enabled: false, categories: [], keywords: [] });
  const [keyword, setKeyword] = useState('');

  const { data } = useQuery({ queryKey: ['student', 'job-alerts'], queryFn: getJobAlerts });
  useEffect(() => {
    if (data && open) setForm({ enabled: data.enabled, categories: data.categories, keywords: data.keywords });
  }, [data, open]);

  const saveMutation = useMutation({
    mutationFn: updateJobAlerts,
    onSuccess: (saved) => {
      queryClient.setQueryData(['student', 'job-alerts'], saved);
      toast.success(t(saved.enabled ? 'Job alerts saved. We will notify you about matching jobs.' : 'Job alerts turned off.'));
      setOpen(false);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || t('Could not save job alerts.')),
  });

  const categories = data?.availableCategories?.length ? data.availableCategories : FALLBACK_CATEGORIES;
  const toggleCategory = (category: string) => setForm((f) => ({
    ...f,
    categories: f.categories.includes(category) ? f.categories.filter((c) => c !== category) : [...f.categories, category],
  }));
  const addKeyword = () => {
    const value = keyword.trim();
    if (!value || form.keywords.includes(value) || form.keywords.length >= 10) return;
    setForm((f) => ({ ...f, keywords: [...f.keywords, value] }));
    setKeyword('');
  };
  const nothingSelected = form.enabled && !form.categories.length && !form.keywords.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <BellRing size={14} className={data?.enabled ? 'text-brand-600 dark:text-brand-300' : undefined} />
          {t('Job alerts')}{data?.enabled ? ` · ${t('On')}` : ''}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle>{t('Job alerts')}</DialogTitle>
          <DialogDescription>{t('Get a notification when new jobs match these categories or keywords.')}</DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-5">
          <button
            type="button"
            role="switch"
            aria-checked={form.enabled}
            onClick={() => setForm((f) => ({ ...f, enabled: !f.enabled }))}
            className="flex w-full items-center justify-between rounded-xl border border-ink-200 px-3.5 py-3 text-sm font-semibold dark:border-ink-dark-border"
          >
            {t(form.enabled ? 'Alerts on' : 'Alerts off')}
            <span className={cn('h-[22px] w-[40px] rounded-full p-0.5 transition', form.enabled ? 'bg-brand-600' : 'bg-ink-200 dark:bg-ink-700')}>
              <span className={cn('block h-[18px] w-[18px] rounded-full bg-white transition', form.enabled && 'translate-x-[18px] rtl:-translate-x-[18px]')} />
            </span>
          </button>

          <fieldset disabled={!form.enabled} className="space-y-5 disabled:opacity-50">
            <div>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">{t('Categories')}</legend>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => {
                  const active = form.categories.includes(category);
                  const meta = getCategoryMeta(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleCategory(category)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-semibold transition',
                        active ? meta.badge : 'border-ink-200 text-ink-600 hover:border-brand-200 dark:border-ink-dark-border dark:text-ink-300'
                      )}
                    >
                      <meta.icon size={13} /> {t(meta.label)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="job-alert-keyword" className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">{t('Keywords')}</label>
              <div className="flex gap-2">
                <Input
                  id="job-alert-keyword"
                  value={keyword}
                  maxLength={40}
                  placeholder={t('e.g. React, Arabic, video')}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
                />
                <Button type="button" variant="outline" onClick={addKeyword} aria-label={t('Add keyword')}><Plus size={15} /></Button>
              </div>
              {form.keywords.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {form.keywords.map((k) => (
                    <span key={k} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
                      {k}
                      <button type="button" aria-label={t('Remove {keyword}', { keyword: k })} onClick={() => setForm((f) => ({ ...f, keywords: f.keywords.filter((x) => x !== k) }))}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </fieldset>

          {nothingSelected ? <p className="text-xs text-amber-700 dark:text-amber-300">{t('Pick at least one category or keyword.')}</p> : null}

          <Button
            type="button"
            className="w-full"
            disabled={saveMutation.isPending || nothingSelected}
            onClick={() => saveMutation.mutate(form)}
          >
            {t(saveMutation.isPending ? 'Saving…' : 'Save alerts')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
