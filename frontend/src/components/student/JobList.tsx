import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Building2, Clock, DollarSign, Search, SendHorizonal, ShieldAlert, Sparkles, X,
} from 'lucide-react';
import { toast } from 'sonner';

import { fetchJobs, getStudentProfile, getStudentProposals, improveCoverLetter, submitProposal } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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

interface JobListProps {
  embedded?: boolean;
}

interface ProposalDraft {
  details: string;
  timeline: string;
  portfolio: string;
  budget: string;
}

const emptyDraft = (): ProposalDraft => ({ details: '', timeline: '', portfolio: '', budget: '' });

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const JobList: React.FC<JobListProps> = ({ embedded = false }) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ProposalDraft>>({});
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const userId = user?._id || user?.id;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

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

  const submittedJobIds = useMemo(() => {
    const ids = (proposals || []).map((p: any) => p.jobId?._id || p.jobId);
    return new Set(ids);
  }, [proposals]);

  const verifiedSkillIds = useMemo(
    () => new Set((profile?.verifiedSkills || []).map((item: any) => String(item.skill?._id || item.skill))),
    [profile]
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
      setDraftField(activeJobId, 'details', improved);
      toast.success('Cover letter improved.');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to improve cover letter');
    },
  });

  const filteredJobs = useMemo(() => jobs || [], [jobs]);

  const getDraft = (jobId: string) => drafts[jobId] ?? emptyDraft();

  const setDraftField = (jobId: string, field: keyof ProposalDraft, value: string) => {
    setDrafts((p) => ({ ...p, [jobId]: { ...getDraft(jobId), [field]: value } }));
  };

  const activeJob = filteredJobs.find((j: any) => (j._id || j.id) === activeJobId);

  const getMissingVerifiedSkills = (job: any) =>
    (job?.requiredSkills || []).filter((skill: any) => !verifiedSkillIds.has(String(skill?._id || skill)));

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
    <div className="space-y-6">
      {!embedded && (
        <PageHeader
          eyebrow="Student workspace"
          title="Job board"
          description="Discover student-friendly opportunities and send tailored proposals."
        />
      )}

      {/* Search bar */}
      <div className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3 shadow-soft dark:border-ink-dark-border dark:bg-ink-dark-surface">
        <Search size={16} className="shrink-0 text-ink-400" />
        <Input
          placeholder="Search by title, skill, or keyword..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-h-0 border-0 bg-transparent p-0 text-sm shadow-none focus:ring-0 dark:bg-transparent"
        />
        {search && (
          <button onClick={() => setSearch('')} className="shrink-0 text-ink-400 hover:text-ink-600">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-xl" />)}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <EmptyState title="Unable to load jobs" description="The job board could not be loaded. Please try again." />
      )}

      {/* Empty state */}
      {!isLoading && !isError && filteredJobs.length === 0 && (
        <EmptyState
          title={debouncedSearch ? 'No jobs match this search' : 'No jobs available yet'}
          description={debouncedSearch ? 'Try a broader keyword.' : 'New jobs will appear here as clients publish them.'}
        />
      )}

      {/* Job cards */}
      {!isLoading && !isError && filteredJobs.length > 0 && (
        <motion.div
          className="grid gap-4 xl:grid-cols-2"
          variants={stagger}
          initial="hidden"
          animate="visible"
          key={debouncedSearch}
        >
          <AnimatePresence>
            {filteredJobs.map((job: any) => {
              const jobKey = job._id || job.id;
              const hasSubmitted = submittedJobIds.has(jobKey);
              const skills = job.requiredSkills || [];
              const draft = getDraft(jobKey);
              const missingSkills = getMissingVerifiedSkills(job);
              const canApply = missingSkills.length === 0;

              return (
                <motion.div key={jobKey} variants={fadeUp} layout>
                  <Card className="group flex flex-col gap-0 overflow-hidden p-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card">
                    {/* Card header section */}
                    <CardHeader className="gap-0 space-y-3 p-5 pb-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                            <Briefcase size={18} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate font-semibold text-ink-900 dark:text-white">{job.title}</h3>
                            {job.clientId?.name && (
                              <p className="flex items-center gap-1 text-xs text-ink-500 dark:text-ink-400">
                                <Building2 size={10} />
                                {job.clientId.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant={hasSubmitted ? 'success' : 'brand'} className="shrink-0">
                          {hasSubmitted ? 'Applied' : 'Open'}
                        </Badge>
                      </div>

                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {skills.slice(0, 4).map((skill: any) => (
                            <Badge key={skill._id || skill} variant="subtle" className="dark:border-brand-700/40 dark:bg-brand-900/30 dark:text-brand-300">
                              {skill.name || skill}
                            </Badge>
                          ))}
                          {skills.length > 4 && (
                            <span className="text-xs text-ink-400">+{skills.length - 4} more</span>
                          )}
                        </div>
                      )}

                      <p className="line-clamp-2 text-sm leading-6 text-ink-600 dark:text-ink-300">
                        {job.description}
                      </p>
                    </CardHeader>

                    <Separator />

                    {/* Meta row */}
                    <CardContent className="flex flex-wrap items-center gap-4 px-5 py-3">
                      {(job.budgetMin !== undefined || job.budgetMax !== undefined) && (
                        <span className="flex items-center gap-1.5 text-sm text-ink-600 dark:text-ink-300">
                          <DollarSign size={13} className="text-ink-400" />
                          <span className="font-medium">{job.budgetMin ?? '—'} – {job.budgetMax ?? '—'}</span>
                        </span>
                      )}
                      {job.duration && (
                        <span className="flex items-center gap-1.5 text-sm text-ink-600 dark:text-ink-300">
                          <Clock size={13} className="text-ink-400" />
                          <span className="font-medium">{job.duration}</span>
                        </span>
                      )}
                    </CardContent>

                    <Separator />

                    {/* Action row */}
                    <div className="px-5 py-4">
                      {hasSubmitted ? (
                        <div className="flex items-center gap-2 rounded-lg border border-accent-200 bg-accent-50 px-3 py-2 dark:border-accent-700/30 dark:bg-accent-900/15">
                          <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
                          <p className="text-sm font-medium text-accent-700 dark:text-accent-300">Application submitted — awaiting review</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Button
                            className="w-full"
                            onClick={() => setActiveJobId(jobKey)}
                            disabled={isFetching || !canApply}
                          >
                            <SendHorizonal size={15} />
                            Apply for this role
                          </Button>
                          {!canApply && (
                            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-700/30 dark:bg-amber-900/10">
                              <ShieldAlert size={15} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" />
                              <p className="text-sm text-amber-700 dark:text-amber-200">
                                Verify these skills first: {missingSkills.map((skill: any) => skill.name || skill).join(', ')}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Proposal Sheet */}
      <Sheet open={!!activeJobId} onOpenChange={(open) => { if (!open) setActiveJobId(null); }}>
        <SheetContent side="right" className="flex flex-col overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="pr-6">{activeJob?.title || 'Apply for this role'}</SheetTitle>
            <SheetDescription>
              Complete the form below. A strong cover letter significantly improves your chance.
            </SheetDescription>
          </SheetHeader>

          {activeJob && (
            <div className="flex flex-wrap gap-3 rounded-lg border border-ink-200 bg-ink-50 p-3 text-sm dark:border-ink-dark-border dark:bg-white/5">
              {(activeJob.budgetMin !== undefined || activeJob.budgetMax !== undefined) && (
                <span className="flex items-center gap-1.5 text-ink-600 dark:text-ink-300">
                  <DollarSign size={13} /> {activeJob.budgetMin ?? '—'} – {activeJob.budgetMax ?? '—'}
                </span>
              )}
              {activeJob.duration && (
                <span className="flex items-center gap-1.5 text-ink-600 dark:text-ink-300">
                  <Clock size={13} /> {activeJob.duration}
                </span>
              )}
            </div>
          )}

          {activeJob && getMissingVerifiedSkills(activeJob).length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/10 dark:text-amber-200">
              You cannot apply until these required skills are verified:
              {' '}
              {getMissingVerifiedSkills(activeJob).map((skill: any) => skill.name || skill).join(', ')}
            </div>
          )}

          <Separator />

          <div className="flex flex-1 flex-col gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-500 dark:text-ink-400">
                Cover letter <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-ink-500 dark:text-ink-dark-muted">
                  Write your draft first, then let AI tighten the language.
                </p>
                <Button
                  type="button"
                  variant="soft"
                  size="sm"
                  disabled={
                    proposalMutation.isPending ||
                    improveLetterMutation.isPending ||
                    !(activeJobId ? getDraft(activeJobId).details.trim() : '')
                  }
                  onClick={() => {
                    if (!activeJobId) return;
                    improveLetterMutation.mutate({
                      text: getDraft(activeJobId).details,
                      jobTitle: activeJob?.title,
                    });
                  }}
                  className="shrink-0"
                >
                  <Sparkles size={14} className={improveLetterMutation.isPending ? 'animate-pulse' : ''} />
                  {improveLetterMutation.isPending ? 'Improving...' : 'Improve with AI'}
                </Button>
              </div>
              <Textarea
                placeholder="Explain why you are a strong fit. Mention relevant experience, what you will deliver, and why this role interests you."
                rows={6}
                value={activeJobId ? getDraft(activeJobId).details : ''}
                onChange={(e) => activeJobId && setDraftField(activeJobId, 'details', e.target.value)}
                disabled={proposalMutation.isPending || improveLetterMutation.isPending}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-500 dark:text-ink-400">Proposed budget</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="500"
                  value={activeJobId ? getDraft(activeJobId).budget : ''}
                  onChange={(e) => activeJobId && setDraftField(activeJobId, 'budget', e.target.value)}
                  disabled={proposalMutation.isPending}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-500 dark:text-ink-400">Your timeline</label>
                <Input
                  placeholder="e.g. 2 weeks"
                  value={activeJobId ? getDraft(activeJobId).timeline : ''}
                  onChange={(e) => activeJobId && setDraftField(activeJobId, 'timeline', e.target.value)}
                  disabled={proposalMutation.isPending}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-500 dark:text-ink-400">Portfolio links</label>
              <Input
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
