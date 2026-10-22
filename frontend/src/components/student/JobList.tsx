import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
  Bookmark,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  MapPin,
  RotateCcw,
  Search,
  SendHorizonal,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { SKILL_CATEGORIES, getCategoryMeta, getSkillCategory } from '@/lib/skillCategories';
import { toast } from 'sonner';

import { getExternalApplyUrl, getExternalJobUrl } from '@/lib/externalJobs';
import { fetchJobs, getSavedJobs, getStudentProfile, getStudentProposals, improveCoverLetter, setJobSaved, submitProposal } from '@/services/api';
import { JobAlertsDialog } from './JobAlertsDialog';
import { useI18n } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CompanyLogo, getCompanyName, isCompanyVerified } from '@/components/ui/company-logo';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useAuthContext } from '@/context/AuthContext';
import { setCompanionPageJob, takeProposalHandoff } from '@/features/companion/companionStore';

interface JobListProps {
  embedded?: boolean;
}

interface ProposalDraft {
  details: string;
  timeline: string;
  portfolio: string;
  budget: string;
  lastManualDetails?: string;
  aiEnhanced?: boolean;
}

const emptyDraft = (): ProposalDraft => ({ details: '', timeline: '', portfolio: '', budget: '' });

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};


const workTypeFilters = ['All', 'Internship', 'Fixed project', 'Quick task', 'Flexible'] as const;
const budgetFilters = [
  { label: 'Any budget', value: 'any' },
  { label: 'Under 15k', value: 'under-15k' },
  { label: '15k-25k', value: '15k-25k' },
  { label: '25k+', value: '25k-plus' },
] as const;

function getJobCategories(job: any): string[] {
  const skills = Array.isArray(job?.requiredSkills) ? job.requiredSkills : [];
  const fromSkills = skills.map((skill: any) => getCategoryMeta(getSkillCategory(skill)).key);
  return Array.from(new Set<string>([...(job?.category ? [getCategoryMeta(job.category).key] : []), ...fromSkills]));
}
function getWorkType(job: any) {
  if (job?.type === 'internship') return 'Internship';

  const explicit = String(job?.jobType || '').trim();
  if (explicit) return explicit;

  const duration = String(job?.duration || '').toLowerCase();
  if (duration.includes('day')) return 'Quick task';
  if (duration.includes('week')) return 'Fixed project';
  return 'Flexible';
}

function getMaxBudget(job: any) {
  const value = job?.budgetMax ?? job?.budget ?? job?.budgetMin;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function matchesCategory(job: any, category: string) {
  if (category === 'All') return true;
  return getJobCategories(job).includes(category);
}
function matchesBudget(job: any, budgetBand: string) {
  if (budgetBand === 'any') return true;
  const maxBudget = getMaxBudget(job);
  if (!maxBudget) return false;
  if (budgetBand === 'under-15k') return maxBudget < 15000;
  if (budgetBand === '15k-25k') return maxBudget >= 15000 && maxBudget <= 25000;
  if (budgetBand === '25k-plus') return maxBudget > 25000;
  return true;
}

function budgetLabel(job: any) {
  if (job?.sourceType === 'external') return job.sourceCompensation || 'Pay not disclosed';
  if (job?.type === 'internship' && job?.isUnpaid) return 'Unpaid';
  if (job?.budgetMin !== undefined || job?.budgetMax !== undefined) {
    return `${job.budgetMin !== undefined ? formatCurrency(job.budgetMin) : '-'}-${job.budgetMax !== undefined ? formatCurrency(job.budgetMax) : '-'}`;
  }
  return job?.budget ? formatCurrency(job.budget) : 'Budget not set';
}
function postedLabel(job: any) {
  const source = job?.createdAt || job?.updatedAt;
  if (!source) return 'Recently';
  const days = Math.max(0, Math.round((Date.now() - new Date(source).getTime()) / 86400000));
  if (days === 0) return 'Today';
  if (days === 1) return '1d ago';
  return '{days}d ago';
}

function postedDays(job: any) {
  const source = job?.createdAt || job?.updatedAt;
  return source ? Math.max(0, Math.round((Date.now() - new Date(source).getTime()) / 86400000)) : 0;
}

function matchScore(job: any, verifiedSkillIds: Set<string>) {
  if (job?.sourceType === 'external') return null;
  if (typeof job?.matchScore === 'number') return Math.round(job.matchScore);
  const requiredSkills = Array.isArray(job?.requiredSkills) ? job.requiredSkills : [];
  if (requiredSkills.length === 0) return null;
  const matched = requiredSkills.filter((skill: any) => verifiedSkillIds.has(String(skill?._id || skill))).length;
  return Math.round((matched / requiredSkills.length) * 100);
}

const JobList: React.FC<JobListProps> = ({ embedded = false }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';
  const [search, setSearch] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ProposalDraft>>({});
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedWorkType, setSelectedWorkType] = useState<typeof workTypeFilters[number]>('All');
  const [selectedBudget, setSelectedBudget] = useState<typeof budgetFilters[number]['value']>('any');
  const [readyOnly, setReadyOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [notAppliedOnly, setNotAppliedOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const { t, lang } = useI18n();
  const dateLocale = lang === 'ar' ? 'ar-EG' : 'en-GB';
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const userId = user?._id || user?.id;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setSearch((current) => (current === urlSearch ? current : urlSearch));
  }, [urlSearch]);

  useEffect(() => {
    if (embedded) return;

    const next = new URLSearchParams(searchParams);
    if (debouncedSearch) {
      next.set('search', debouncedSearch);
    } else {
      next.delete('search');
    }

    const currentValue = searchParams.get('search') || '';
    if (currentValue !== debouncedSearch) {
      setSearchParams(next, { replace: true });
    }
  }, [debouncedSearch, embedded, searchParams, setSearchParams]);

  const { data: jobs, isLoading, isError, isFetching } = useQuery({
    queryKey: ['jobs', debouncedSearch],
    queryFn: () => fetchJobs(debouncedSearch ? { search: debouncedSearch } : undefined),
  });

  const { data: proposals } = useQuery({
    queryKey: ['student', 'proposals', userId],
    queryFn: () => getStudentProposals(userId),
    enabled: !!userId,
  });

  const { data: profile } = useQuery({
    queryKey: ['student', 'profile', userId],
    queryFn: () => getStudentProfile(userId),
    enabled: !!userId,
  });

  const { data: savedData } = useQuery({
    queryKey: ['student', 'saved-jobs'],
    queryFn: getSavedJobs,
    enabled: !!userId && !embedded,
  });
  const savedJobIds = useMemo(() => new Set<string>(savedData?.ids || []), [savedData]);

  const saveMutation = useMutation({
    mutationFn: ({ jobId, saved }: { jobId: string; saved: boolean }) => setJobSaved(jobId, saved),
    onMutate: async ({ jobId, saved }) => {
      await queryClient.cancelQueries({ queryKey: ['student', 'saved-jobs'] });
      const previous = queryClient.getQueryData<{ ids: string[]; jobs: any[] }>(['student', 'saved-jobs']);
      const ids = new Set(previous?.ids || []);
      if (saved) ids.add(jobId); else ids.delete(jobId);
      queryClient.setQueryData(['student', 'saved-jobs'], { ids: [...ids], jobs: previous?.jobs || [] });
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['student', 'saved-jobs'], context.previous);
      toast.error(t('Could not update saved jobs.'));
    },
    onSuccess: (_data, { saved }) => toast.success(t(saved ? 'Job saved' : 'Removed from saved jobs')),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['student', 'saved-jobs'] }),
  });

  const submittedJobIds = useMemo(() => {
    const ids = (proposals || []).map((p: any) => p.jobId?._id || p.jobId);
    return new Set(ids);
  }, [proposals]);

  const verifiedSkillIds = useMemo<Set<string>>(
    () => new Set<string>((profile?.verifiedSkills || []).map((item: any) => String(item.skill?._id || item.skill))),
    [profile]
  );

  const getMissingVerifiedSkills = (job: any) =>
    (job?.requiredSkills || []).filter((skill: any) => !verifiedSkillIds.has(String(skill?._id || skill)));

  const allJobs = useMemo(() => jobs || [], [jobs]);
  const categoryOptions = useMemo(() => {
    const builtIn = SKILL_CATEGORIES.filter((item) => item.key !== 'Other').map((item) => item.key as string);
    const custom = new Set<string>();
    allJobs.forEach((job: any) =>
      getJobCategories(job).forEach((key) => {
        if (key !== 'Other' && !builtIn.includes(key)) custom.add(key);
      })
    );
    return ['All', ...builtIn, ...Array.from(custom).sort()].map((label) => ({ label }));
  }, [allJobs]);
  const filteredJobs = useMemo(
    () =>
      allJobs.filter((job: any) => {
        const jobKey = job._id || job.id;
        const hasSubmitted = submittedJobIds.has(jobKey);
        const isReady = job.sourceType !== 'external' && getMissingVerifiedSkills(job).length === 0;
        const isVerified = isCompanyVerified(job);
        const workType = getWorkType(job);

        if (!matchesCategory(job, selectedCategory)) return false;
        if (selectedWorkType !== 'All' && workType !== selectedWorkType) return false;
        if (!matchesBudget(job, selectedBudget)) return false;
        if (readyOnly && !isReady) return false;
        if (verifiedOnly && !isVerified) return false;
        if (notAppliedOnly && hasSubmitted) return false;
        if (savedOnly && !savedJobIds.has(jobKey)) return false;
        return true;
      }),
    [allJobs, notAppliedOnly, readyOnly, savedJobIds, savedOnly, selectedBudget, selectedCategory, selectedWorkType, submittedJobIds, verifiedOnly, verifiedSkillIds]
  );

  const proposalMutation = useMutation({
    mutationFn: ({ jobId, details, proposedBudget }: { jobId: string; details: string; proposedBudget?: number }) =>
      submitProposal(jobId, { details, proposedBudget }),
    onSuccess: (_data, variables) => {
      toast.success('Proposal submitted');
      setActiveJobId(null);
      setDrafts((p) => { const n = { ...p }; delete n[variables.jobId]; return n; });
      queryClient.invalidateQueries({ queryKey: ['student', 'proposals', userId] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to submit proposal');
    },
  });

  const improveLetterMutation = useMutation({
    mutationFn: ({ text, jobTitle }: { text: string; jobTitle?: string }) =>
      improveCoverLetter({ text, jobTitle }),
    onSuccess: (data) => {
      if (!activeJobId) return;
      const improved = data?.improved?.trim();
      if (!improved) {
        toast.error('Could not improve the cover letter.');
        return;
      }
      setDrafts((prev) => ({
        ...prev,
        [activeJobId]: {
          ...getDraft(activeJobId),
          lastManualDetails: getDraft(activeJobId).details,
          details: improved,
          aiEnhanced: true,
        },
      }));
      toast.success('Cover letter improved.');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to improve cover letter');
    },
  });

  const getDraft = (jobId: string) => drafts[jobId] ?? emptyDraft();

  const setDraftField = (jobId: string, field: keyof ProposalDraft, value: string) => {
    setDrafts((p) => ({ ...p, [jobId]: { ...getDraft(jobId), [field]: value } }));
  };

  const openJobCount = allJobs.filter((job: any) => !submittedJobIds.has(job._id || job.id)).length;
  const readyJobCount = allJobs.filter((job: any) => {
    if (job.sourceType === 'external') return false;
    const jobKey = job._id || job.id;
    return !submittedJobIds.has(jobKey) && getMissingVerifiedSkills(job).length === 0;
  }).length;

  const activeJob = allJobs.find((j: any) => (j._id || j.id) === activeJobId);
  const activeDraft = activeJobId ? getDraft(activeJobId) : emptyDraft();

  // Deep link from the Shaghol companion: /student/jobs?apply=<jobId> opens the
  // regular apply sheet, so eligibility and duplicate checks stay unchanged.
  const applyParam = embedded ? null : searchParams.get('apply');
  useEffect(() => {
    if (!applyParam || isLoading || !jobs) return;
    const next = new URLSearchParams(searchParams);
    next.delete('apply');
    setSearchParams(next, { replace: true });
    const job = allJobs.find((j: any) => (j._id || j.id) === applyParam);
    if (!job || job.sourceType === 'external') {
      toast.error('This job is no longer listed.');
      return;
    }
    setActiveJobId(applyParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyParam, isLoading, jobs]);

  // A proposal drafted with the companion pre-fills an empty cover letter only.
  useEffect(() => {
    if (!activeJobId) return;
    const handoff = takeProposalHandoff(activeJobId);
    if (handoff && !getDraft(activeJobId).details.trim()) setDraftField(activeJobId, 'details', handoff);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeJobId]);

  // Tell the companion which job is open so it can offer contextual help.
  useEffect(() => {
    if (embedded) return;
    setCompanionPageJob(activeJobId && activeJob ? { id: activeJobId, title: activeJob.title } : null);
  }, [embedded, activeJobId, activeJob]);
  useEffect(() => () => { if (!embedded) setCompanionPageJob(null); }, [embedded]);
  const coverLetterLength = activeDraft.details.trim().length;
      const isActiveJobUnpaidInternship =
    activeJob?.type === 'internship' && activeJob?.isUnpaid === true;
  const hasActiveFilters =
    Boolean(search) ||
    selectedCategory !== 'All' ||
    selectedWorkType !== 'All' ||
    selectedBudget !== 'any' ||
    readyOnly ||
    verifiedOnly ||
    notAppliedOnly ||
    savedOnly;

  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('All');
    setSelectedWorkType('All');
    setSelectedBudget('any');
    setReadyOnly(false);
    setVerifiedOnly(false);
    setNotAppliedOnly(false);
    setSavedOnly(false);
  };

  const handleSubmit = async () => {
    if (!activeJobId) return;
    if (submittedJobIds.has(activeJobId)) {
      toast.error('Already applied to this job.');
      return;
    }
    if (activeJob) {
      const missingSkills = getMissingVerifiedSkills(activeJob);
      if (missingSkills.length > 0) {
        toast.error(`Verify required skills first: ${missingSkills.map((skill: any) => skill.name || skill).join(', ')}`);
        return;
      }
    }
    const draft = getDraft(activeJobId);
    if (!draft.details.trim()) {
      toast.error('Cover letter is required.');
      return;
    }
    const parsedBudget = draft.budget ? Number(draft.budget) : undefined;
    if (draft.budget && (!Number.isFinite(parsedBudget) || (parsedBudget as number) < 0)) {
      toast.error('Budget must be a valid non-negative number.');
      return;
    }
    const composedDetails = [
      `Cover Letter: ${draft.details.trim()}`,
      draft.timeline.trim() ? `Timeline: ${draft.timeline.trim()}` : null,
      draft.portfolio.trim() ? `Portfolio Links: ${draft.portfolio.trim()}` : null,
    ].filter(Boolean).join('\n');

    await proposalMutation.mutateAsync({ jobId: activeJobId, details: composedDetails, proposedBudget: parsedBudget });
  };

  return (
    <div className="min-w-0 space-y-[22px]">
      {!embedded && (
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <PageHeader
            title={t("Find work")}
            description={t("Roles matched to your verified skills and availability.")}
          />
          <div className="flex items-center gap-2">
            <span className="sh-chip font-mono">{t("{count} shown", { count: filteredJobs.length || 0 })}</span>
            <JobAlertsDialog />
            <Button variant="outline" size="sm"><SlidersHorizontal size={14} /> {t('Sort: Best match')}</Button>
          </div>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="sh-panel hidden p-[18px] lg:sticky lg:top-[88px] lg:block">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-900 dark:text-white">{t("Filters")}</span>
            {hasActiveFilters ? (
              <button type="button" onClick={resetFilters} className="text-xs font-semibold text-brand-600 transition hover:text-brand-700 dark:text-brand-300 dark:hover:text-brand-200">{t("Reset")}</button>
            ) : null}
          </div>

          <div className="space-y-[18px]">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-500 dark:text-ink-dark-muted">{t("Category")}</div>
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map((item) => {
                  const active = selectedCategory === item.label;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedCategory(item.label)}
                      className={`rounded-[8px] border px-2.5 py-1.5 text-[12.5px] font-semibold transition ${
                        active
                          ? 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/35 dark:bg-brand-500/15 dark:text-brand-200'
                          : 'border-ink-200 bg-ink-50 text-ink-600 hover:border-brand-200 dark:hover:border-brand-500/40 hover:text-brand-700 dark:hover:text-brand-300 dark:border-ink-dark-border dark:bg-white/[0.045] dark:text-ink-300'
                      }`}
                    >
                      {t(item.label)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-500 dark:text-ink-dark-muted">{t("Job type")}</div>
              <div className="space-y-2.5">
                {workTypeFilters.map((type) => {
                  const active = selectedWorkType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedWorkType(type)}
                      className="flex w-full items-center gap-2 text-start text-[13.5px] text-ink-600 transition hover:text-brand-700 dark:text-ink-300"
                    >
                      <span className={`flex h-[17px] w-[17px] items-center justify-center rounded-[5px] border ${active ? 'border-brand-500 bg-brand-500' : 'border-ink-300 dark:border-ink-600'}`}>
                        {active ? <CheckCircle2 size={11} className="text-white" /> : null}
                      </span>
                      {t(type)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-500 dark:text-ink-dark-muted">{t("Budget range")}</div>
              <div className="space-y-2">
                {budgetFilters.map((item) => {
                  const active = selectedBudget === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedBudget(item.value)}
                      className={`flex w-full items-center justify-between rounded-[10px] border px-3 py-2 text-[13px] font-semibold transition ${
                        active
                          ? 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/35 dark:bg-brand-500/15 dark:text-brand-200'
                          : 'border-ink-200 bg-white text-ink-600 hover:border-brand-200 dark:hover:border-brand-500/40 hover:text-brand-700 dark:hover:text-brand-300 dark:border-ink-dark-border dark:bg-white/[0.04] dark:text-ink-300'
                      }`}
                    >
                      {t(item.label)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2.5">
              {[
                { label: 'Ready to apply', checked: readyOnly, setChecked: setReadyOnly },
                { label: 'Verified clients only', checked: verifiedOnly, setChecked: setVerifiedOnly },
                { label: 'Not applied yet', checked: notAppliedOnly, setChecked: setNotAppliedOnly },
                { label: t('Saved jobs ({count})', { count: savedJobIds.size }), checked: savedOnly, setChecked: setSavedOnly },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  aria-pressed={item.checked}
                  onClick={() => item.setChecked((value) => !value)}
                  className={`flex w-full items-center justify-between rounded-[11px] border px-3 py-2.5 text-start text-[13px] font-semibold transition ${
                    item.checked
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300'
                      : 'border-ink-200 bg-white text-ink-600 hover:border-brand-200 dark:hover:border-brand-500/40 dark:border-ink-dark-border dark:bg-white/[0.04] dark:text-ink-300'
                  }`}
                >
                  <span>{t(item.label)}</span>
                  <span className={`h-[19px] w-[34px] rounded-full p-0.5 transition ${item.checked ? 'bg-emerald-500' : 'bg-ink-200 dark:bg-ink-700'}`}>
                    <span className={`block h-[15px] w-[15px] rounded-full bg-white transition ${item.checked ? 'translate-x-[15px] rtl:-translate-x-[15px]' : ''}`} />
                  </span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-ink-100 pt-4 dark:border-ink-dark-border">
              {[
                { label: 'Open', value: openJobCount },
                { label: 'Ready', value: readyJobCount },
                { label: 'Shown', value: filteredJobs.length },
              ].map((item) => (
                <div key={item.label} className="rounded-[10px] bg-ink-50 px-2 py-2 text-center dark:bg-white/[0.04]">
                  <div className="sh-number text-sm text-ink-900 dark:text-white">{item.value}</div>
                  <div className="mt-0.5 text-[10.5px] font-semibold text-ink-500">{t(item.label)}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="min-w-0 space-y-3">
          <div className="sh-panel flex min-w-0 items-center gap-3 px-4 py-3">
            <Search size={16} className="shrink-0 text-ink-500" />
            <Input aria-label={t("Search by title, skill, or keyword")}
              placeholder={t("Search by title, skill, or keyword...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-h-0 border-0 bg-transparent p-0 text-sm shadow-none focus:ring-0 dark:bg-transparent"
            />
            {search ? (
              <button type="button" aria-label="Clear search" onClick={() => setSearch('')} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-600">
                <X size={14} />
              </button>
            ) : null}
          </div>

          {!isLoading && !isError ? (
            <div className="flex items-center gap-3 rounded-[14px] border border-brand-100 bg-brand-50 px-4 py-3 dark:border-brand-500/25 dark:bg-brand-500/15">
              <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-brand-400 to-brand-500 text-white">
                <Sparkles size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-ink-900 dark:text-white">{t(readyJobCount === 1 ? '{count} job ready for your verified skills' : '{count} jobs ready for your verified skills', { count: readyJobCount })}</div>
                <div className="mt-0.5 text-[12.5px] text-ink-600 dark:text-ink-300">{t('Based on your verified skill profile and current applications.')}</div>
              </div>
              <Button variant="outline" size="sm" className="hidden border-brand-100 text-brand-600 md:inline-flex">{t('View matches')}</Button>
            </div>
          ) : null}

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[180px] w-full rounded-2xl" />)}
            </div>
          ) : null}

          {isError ? (
            <EmptyState title={t("Unable to load jobs")} description={t("The job board could not be loaded. Please try again.")} />
          ) : null}

          {!isLoading && !isError && filteredJobs.length === 0 ? (
            <EmptyState
              title={t(debouncedSearch || hasActiveFilters ? 'No jobs match these filters' : 'No jobs available yet')}
              description={t(debouncedSearch || hasActiveFilters ? 'Try a broader keyword or reset the filters.' : 'New jobs will appear here as clients publish them.')}
            />
          ) : null}

          {!isLoading && !isError && filteredJobs.length > 0 ? (
            <motion.div className="space-y-3" variants={stagger} initial="hidden" animate="visible" key={debouncedSearch}>
              <AnimatePresence>
                {filteredJobs.map((job: any) => {
                  const jobKey = job._id || job.id;
                  const hasSubmitted = submittedJobIds.has(jobKey);
                  const skills = job.requiredSkills || [];
                  const missingSkills = getMissingVerifiedSkills(job);
                  const externalUrl = getExternalJobUrl(job);
                  const applyUrl = getExternalApplyUrl(job);
                  const isExternal = job.sourceType === 'external';
                  const canApply = !isExternal && missingSkills.length === 0;
                  const score = matchScore(job, verifiedSkillIds);
                  const clientVerified = isCompanyVerified(job);

                  return (
                    <motion.article
                      key={jobKey}
                      variants={fadeUp}
                      layout
                      className="sh-panel flex flex-col gap-4 p-[18px] transition hover:-translate-y-0.5 hover:border-brand-200 dark:hover:border-brand-500/40 xl:flex-row"
                    >
                      <CompanyLogo job={job} className="h-[46px] w-[46px]" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="m-0 min-w-0 max-w-full text-[16px] font-semibold tracking-[-0.01em] text-ink-900 [overflow-wrap:anywhere] dark:text-white" dir="auto">{job.title}</h3>
                          {job.isDemo ? <Badge variant="subtle">{t("Demo project")}</Badge> : null}
                                                    {getJobCategories(job).slice(0, 2).map((categoryKey) => {
                            const meta = getCategoryMeta(categoryKey);
                            return (
                              <span key={categoryKey} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-semibold ${meta.badge}`}>
                                <meta.icon size={11} />
                                {t(meta.label)}
                              </span>
                            );
                          })}
                                                    {job.type === 'internship' ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-brand-100 bg-brand-50 px-2 py-0.5 text-[11.5px] font-semibold text-brand-700 dark:border-brand-400/25 dark:bg-brand-400/10 dark:text-brand-200">
                              Internship
                            </span>
                          ) : null}
                                                    {job.type === 'internship' && (job.positions || 1) > 1 ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-ink-50 px-2 py-0.5 text-[11.5px] font-semibold text-ink-600 dark:border-ink-dark-border dark:bg-white/[0.055] dark:text-ink-300">
                              {job.positionsFilled || 0}/{job.positions} positions filled
                            </span>
                          ) : null}
                          {job.workMode ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-ink-50 px-2 py-0.5 text-[11.5px] font-semibold text-ink-600 dark:border-ink-dark-border dark:bg-white/[0.055] dark:text-ink-300">
                              {t(job.workMode === 'onsite' ? 'On-site' : job.workMode === 'online' ? 'Online' : 'Hybrid')}
                            </span>
                          ) : null}
                          {clientVerified ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[11.5px] font-semibold text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300">
                              <CheckCircle2 size={11} /> Verified client
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-ink-500 dark:text-ink-dark-muted">
                          <span className="inline-flex items-center gap-1.5 font-semibold text-ink-600 dark:text-ink-300">
                            <CompanyLogo job={job} className="h-5 w-5 rounded-[6px] border-ink-100 shadow-none dark:border-white/10 [&_img]:p-0.5" />
                            <bdi>{getCompanyName(job)}</bdi>
                          </span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1"><MapPin size={12} /> <bdi>{job.sourceLocation || job.location || t('Remote')}</bdi></span>
                          <span>·</span>
                          <span>{t(postedLabel(job), { days: postedDays(job) })}</span>
                        </div>
                        {isExternal ? (
                          <p className="mt-2 text-xs text-ink-600 dark:text-ink-300">
                            {t('External listing from')}{' '}
                            {externalUrl ? <a href={externalUrl} target="_blank" rel="noopener" className="underline">{job.sourceName}</a> : job.sourceName}
                            {job.sourceEmploymentType ? <> · {t('Listed as')} “{job.sourceEmploymentType}”</> : null}
                            {job.sourcePublishedAt ? <> · {t('Published')} {new Date(job.sourcePublishedAt).toLocaleDateString(dateLocale)}</> : null}
                            {' '}· {t('Checked')} {new Date(job.sourceLastSeenAt).toLocaleDateString(dateLocale)}. {t('{company} does not post on Shaghalny; applications are handled by the original source.', { company: job.sourceCompanyName })}
                          </p>
                        ) : null}
                        <p className="mt-2 line-clamp-2 text-[13.5px] leading-6 text-ink-600 [overflow-wrap:anywhere] dark:text-ink-300" dir="auto">{job.description}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {skills.slice(0, 4).map((skill: any) => (
                            <span key={skill._id || skill} className="rounded-[7px] border border-ink-200 bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-600 dark:border-ink-dark-border dark:bg-white/[0.055] dark:text-ink-300">
                              {skill.name || skill}
                            </span>
                          ))}
                          <span className="px-1 py-1 text-xs font-semibold text-ink-500"><bdi>{t(job.duration || (job.sourceType === 'external' ? (job.sourceCompensation ? 'As published by source' : 'See original terms') : 'Fixed price'))}</bdi></span>
                        </div>
                        {!isExternal && !canApply ? (
                          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-500/25 dark:bg-amber-500/10">
                            <ShieldAlert size={15} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" />
                            <p className="min-w-0 break-words text-sm text-amber-700 dark:text-amber-200">
                              {t('Verify these skills first:')} {missingSkills.map((skill: any) => skill.name || skill).join(', ')}
                            </p>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-col justify-between gap-3 border-t border-ink-100 pt-3 xl:w-[158px] xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0 dark:border-ink-dark-border">
                        <div className="flex items-start justify-between gap-3 xl:flex-col xl:items-end">
                          <button
                            type="button"
                            aria-pressed={savedJobIds.has(jobKey)}
                            aria-label={savedJobIds.has(jobKey) ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
                            title={t(savedJobIds.has(jobKey) ? 'Saved' : 'Save job')}
                            onClick={() => saveMutation.mutate({ jobId: jobKey, saved: !savedJobIds.has(jobKey) })}
                            className={`flex h-8 w-8 items-center justify-center rounded-[9px] border transition ${
                              savedJobIds.has(jobKey)
                                ? 'border-brand-200 bg-brand-50 text-brand-600 dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-300'
                                : 'border-ink-200 bg-white text-ink-500 hover:border-brand-200 hover:text-brand-600 dark:border-ink-dark-border dark:bg-white/[0.055]'
                            }`}
                          >
                            <Bookmark size={15} className={savedJobIds.has(jobKey) ? 'fill-current' : undefined} />
                          </button>
                          <div className="text-right">
                            <div className="sh-number text-[17px] text-ink-900 dark:text-white"><span dir="ltr">{t(budgetLabel(job))}</span></div>
                            <div className="text-[11.5px] text-ink-500"><bdi>{t(job.duration || (job.sourceType === 'external' ? (job.sourceCompensation ? 'As published by source' : 'See original terms') : 'Fixed price'))}</bdi></div>
                            {score !== null ? (
                              <div className="mt-2 flex items-center justify-end gap-2">
                                <div
                                  className="flex h-[26px] w-[26px] items-center justify-center rounded-full"
                                  style={{ background: `conic-gradient(#6366f1 ${score}%, var(--ring-track) 0)` }}
                                >
                                  <span className="h-[18px] w-[18px] rounded-full bg-white dark:bg-ink-dark-surface" />
                                </div>
                                <span className="text-xs text-ink-600 dark:text-ink-300"><b className="text-ink-900 dark:text-white">{score}%</b> {t('match')}</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        {isExternal ? (
                          applyUrl ? <Button asChild className="w-full">
                            <a href={applyUrl} target="_blank" rel="noopener" aria-label={`Apply for ${job.title} via ${job.sourceName} (opens in a new tab)`}>{t('Apply on source')}</a>
                          </Button> : <p className="text-sm">{t('Original listing unavailable')}</p>
                        ) : hasSubmitted ? (
                          <div className="rounded-[10px] border border-emerald-100 bg-emerald-50 px-3 py-2 text-center text-sm font-semibold text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300">
                            {t('Applied')}
                          </div>
                        ) : (
                          <Button className="w-full" onClick={() => setActiveJobId(jobKey)} disabled={isFetching || !canApply}>
                            {t('Apply now')}
                          </Button>
                        )}
                      </div>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          ) : null}
        </main>
      </div>

      <Sheet open={!!activeJobId} onOpenChange={(open) => { if (!open) setActiveJobId(null); }}>
        <SheetContent side="right" className="flex flex-col overflow-y-auto border-ink-200 bg-white/95 shadow-elevated backdrop-blur-xl dark:border-ink-dark-border dark:bg-ink-dark-surface/95 sm:max-w-lg">
          <SheetHeader>
           <SheetTitle className="pr-8 [overflow-wrap:anywhere]">{activeJob?.title || 'Apply for this role'}</SheetTitle>
            <SheetDescription>
              Complete the form below. A strong cover letter significantly improves your chance.
            </SheetDescription>
          </SheetHeader>

          {activeJob ? (
            <div className="flex flex-wrap gap-3 rounded-lg border border-ink-200 bg-ink-50 p-3 text-sm dark:border-ink-dark-border dark:bg-white/5">
                           {(activeJob.budgetMin !== undefined || activeJob.budgetMax !== undefined || activeJob.type === 'internship') ? (
                <span className="flex items-center gap-1.5 text-ink-600 dark:text-ink-300">
                  <Wallet size={13} /> {budgetLabel(activeJob)}
                </span>
              ) : null}
              {activeJob.duration ? (
                <span className="flex items-center gap-1.5 text-ink-600 dark:text-ink-300">
                  <Clock size={13} /> {activeJob.duration}
                </span>
              ) : null}
              {getCompanyName(activeJob) ? (
                <span className="flex items-center gap-1.5 text-ink-600 dark:text-ink-300">
                  <Building2 size={13} /> {getCompanyName(activeJob)}
                </span>
              ) : null}
            </div>
          ) : null}

          {activeJob && getMissingVerifiedSkills(activeJob).length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/10 dark:text-amber-200">
              You cannot apply until these required skills are verified:{' '}
              {getMissingVerifiedSkills(activeJob).map((skill: any) => skill.name || skill).join(', ')}
            </div>
          ) : null}

          <Separator />

          <div className="flex flex-1 flex-col gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-500 dark:text-ink-400">
                    Cover letter <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-xs leading-5 text-ink-500 dark:text-ink-dark-muted">
                    Explain why you fit this role, what you will deliver, and why this job matters to you.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {activeDraft.aiEnhanced && activeDraft.lastManualDetails ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={proposalMutation.isPending || improveLetterMutation.isPending}
                      onClick={() => {
                        if (!activeJobId || !activeDraft.lastManualDetails) return;
                        setDrafts((prev) => ({
                          ...prev,
                          [activeJobId]: {
                            ...getDraft(activeJobId),
                            details: activeDraft.lastManualDetails || '',
                            aiEnhanced: false,
                          },
                        }));
                        toast.success('Restored your original draft.');
                      }}
                    >
                      <RotateCcw size={14} />
                      Undo
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="soft"
                    size="sm"
                    disabled={
                      proposalMutation.isPending ||
                      improveLetterMutation.isPending ||
                      !activeDraft.details.trim()
                    }
                    onClick={() => {
                      if (!activeJobId) return;
                      improveLetterMutation.mutate({
                        text: activeDraft.details,
                        jobTitle: activeJob?.title,
                      });
                    }}
                    className="shrink-0"
                  >
                    <Sparkles size={14} className={improveLetterMutation.isPending ? 'animate-pulse' : ''} />
                    {improveLetterMutation.isPending ? 'Improving...' : 'Polish with AI'}
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-ink-200 bg-ink-50/80 px-3 py-2.5 dark:border-ink-dark-border dark:bg-white/5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-medium text-ink-600 dark:text-ink-300">
                    {coverLetterLength === 0
                      ? 'Start with 2-4 lines, then use AI to refine tone and clarity.'
                      : coverLetterLength < 120
                        ? 'Add a bit more detail before submitting. Mention skills, delivery, and fit.'
                        : 'Good length. You can submit as is or let AI make it sharper.'}
                  </span>
                  {activeDraft.aiEnhanced ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-accent-700 dark:bg-accent-900/20 dark:text-accent-300">
                      <CheckCircle2 size={12} />
                      AI-enhanced
                    </span>
                  ) : null}
                </div>
              </div>

              <label className="block space-y-1.5 text-sm font-medium text-ink-700 dark:text-ink-200">
              <span>Cover letter</span>
              <Textarea
                placeholder="Explain why you are a strong fit. Mention relevant experience, what you will deliver, and why this role interests you."
                rows={6}
                value={activeDraft.details}
                onChange={(e) => activeJobId && setDraftField(activeJobId, 'details', e.target.value)}
                disabled={proposalMutation.isPending || improveLetterMutation.isPending}
                className="min-h-[180px] rounded-xl"
              />
            </label>
              <div className="flex items-center justify-between gap-3 text-xs text-ink-500 dark:text-ink-dark-muted">
                <span>Keep it specific to this job. Avoid generic statements.</span>
                <span>{coverLetterLength} chars</span>
              </div>
            </div>

            <div className={`grid gap-3 ${isActiveJobUnpaidInternship ? '' : 'sm:grid-cols-2'}`}>
              {!isActiveJobUnpaidInternship ? (
                <div className="space-y-1.5">
                  <label htmlFor="joblist-proposed-budget-egp" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-500 dark:text-ink-400">Proposed budget (EGP)</label>
                  <Input id="joblist-proposed-budget-egp"
                    type="number"
                    min={0}
                    placeholder="15000"
                    value={activeJobId ? getDraft(activeJobId).budget : ''}
                    onChange={(e) => activeJobId && setDraftField(activeJobId, 'budget', e.target.value)}
                    disabled={proposalMutation.isPending}
                  />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <label htmlFor="joblist-your-timeline" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-500 dark:text-ink-400">Your timeline</label>
                <Input id="joblist-your-timeline"
                  placeholder="e.g. 2 weeks"
                  value={activeJobId ? getDraft(activeJobId).timeline : ''}
                  onChange={(e) => activeJobId && setDraftField(activeJobId, 'timeline', e.target.value)}
                  disabled={proposalMutation.isPending}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="joblist-portfolio-links" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-500 dark:text-ink-400">Portfolio links</label>
              <Input id="joblist-portfolio-links"
                placeholder="https://github.com/you or https://portfolio.com"
                value={activeJobId ? getDraft(activeJobId).portfolio : ''}
                onChange={(e) => activeJobId && setDraftField(activeJobId, 'portfolio', e.target.value)}
                disabled={proposalMutation.isPending}
              />
            </div>
          </div>

          <SheetFooter className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setActiveJobId(null)} disabled={proposalMutation.isPending} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={proposalMutation.isPending || isFetching} className="flex-1">
              <SendHorizonal size={15} />
              {proposalMutation.isPending ? 'Submitting...' : 'Submit proposal'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default JobList;
