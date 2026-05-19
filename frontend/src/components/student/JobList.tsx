import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Search, SendHorizonal } from 'lucide-react';
import { toast } from 'sonner';

import { fetchJobs, getStudentProposals, submitProposal } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
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

const JobList: React.FC<JobListProps> = ({ embedded = false }) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ProposalDraft>>({});
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const userId = user?._id || user?.id;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);
    return () => clearTimeout(timeout);
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

  const submittedJobIds = useMemo(() => {
    const ids = (proposals || []).map((proposal: any) => proposal.jobId?._id || proposal.jobId);
    return new Set(ids);
  }, [proposals]);

  const proposalMutation = useMutation({
    mutationFn: ({ jobId, details, proposedBudget }: { jobId: string; details: string; proposedBudget?: number }) =>
      submitProposal(jobId, { details, proposedBudget }),
    onSuccess: (_data, variables) => {
      toast.success('Proposal submitted');
      setExpandedJobId(null);
      setDrafts((p) => {
        const next = { ...p };
        delete next[variables.jobId];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['student', 'proposals', userId] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to submit proposal');
    },
  });

  const filteredJobs = useMemo(() => jobs || [], [jobs]);

  const getDraft = (jobId: string): ProposalDraft => drafts[jobId] ?? emptyDraft();

  const setDraftField = (jobId: string, field: keyof ProposalDraft, value: string) => {
    setDrafts((p) => ({ ...p, [jobId]: { ...getDraft(jobId), [field]: value } }));
  };

  const handleSubmitProposal = async (jobId: string) => {
    if (submittedJobIds.has(jobId)) {
      toast.error('You already submitted a proposal for this job.');
      return;
    }

    const draft = getDraft(jobId);

    if (!draft.details.trim()) {
      toast.error('Please enter a cover letter.');
      return;
    }

    const parsedBudget = draft.budget ? Number(draft.budget) : undefined;
    if (draft.budget && (!Number.isFinite(parsedBudget) || (parsedBudget as number) < 0)) {
      toast.error('Proposed budget must be a non-negative number.');
      return;
    }

    const composedDetails = [
      `Cover Letter: ${draft.details.trim()}`,
      draft.timeline.trim() ? `Timeline: ${draft.timeline.trim()}` : null,
      draft.portfolio.trim() ? `Portfolio Links: ${draft.portfolio.trim()}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    await proposalMutation.mutateAsync({
      jobId,
      details: composedDetails,
      proposedBudget: parsedBudget,
    });
  };

  const toggleExpand = (jobId: string, hasSubmitted: boolean) => {
    if (hasSubmitted) return;
    setExpandedJobId((prev) => (prev === jobId ? null : jobId));
  };

  return (
    <div className="space-y-6">
      {!embedded ? (
        <PageHeader
          eyebrow="Student workspace"
          title="Job board"
          description="Discover student-friendly opportunities, filter quickly, and send tailored proposals."
        />
      ) : null}

      <div className="glass-panel flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-semibold text-ink-900 dark:text-white">Open opportunities</p>
          <p className="text-sm text-ink-600 dark:text-ink-200">Search by title, skill, or project description.</p>
        </div>

        <label className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-ink-200 bg-white/95 px-4 shadow-soft dark:border-ink-dark-border dark:bg-ink-dark-surface/88 md:max-w-sm">
          <Search size={16} className="shrink-0 text-ink-500 dark:text-ink-300" />
          <Input
            placeholder="Search jobs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-h-0 border-0 bg-transparent px-0 shadow-none focus:ring-0 dark:bg-transparent"
          />
        </label>
      </div>

      {isLoading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {isError ? (
        <EmptyState title="Unable to load jobs" description="The job board could not be loaded right now. Please try again in a moment." />
      ) : null}

      {!isLoading && !isError && filteredJobs.length === 0 ? (
        <EmptyState
          title={debouncedSearch ? 'No jobs match this search' : 'No jobs available yet'}
          description={
            debouncedSearch
              ? 'Try a broader keyword or remove filters to see more opportunities.'
              : 'New job posts will appear here as clients publish them.'
          }
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {filteredJobs.map((job: any) => {
          const jobKey = job._id || job.id;
          const hasSubmitted = submittedJobIds.has(jobKey);
          const skills = job.requiredSkills || [];
          const isOpen = expandedJobId === jobKey;
          const draft = getDraft(jobKey);

          return (
            <Card key={jobKey} className="overflow-hidden p-0">
              <CardHeader className="space-y-4 p-6">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <CardTitle className="max-w-3xl text-xl">{job.title}</CardTitle>
                    <Badge variant={hasSubmitted ? 'success' : 'brand'}>{hasSubmitted ? 'Applied' : 'Open'}</Badge>
                  </div>

                  {skills.length ? (
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill: any) => (
                        <Badge
                          key={skill._id || skill}
                          variant="subtle"
                          className="dark:border-brand-700/40 dark:bg-brand-900/30 dark:text-brand-300"
                        >
                          {skill.name || skill}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  <p className="text-sm leading-6 text-ink-600 dark:text-ink-200 line-clamp-3">
                    {job.description}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="muted-panel rounded-lg p-3">
                    <p className="label-muted">Budget</p>
                    <p className="mt-2 text-sm font-semibold text-ink-900 dark:text-white">
                      {job.budgetMin !== undefined || job.budgetMax !== undefined
                        ? `${job.budgetMin ?? '—'} – ${job.budgetMax ?? '—'}`
                        : 'Flexible'}
                    </p>
                  </div>
                  <div className="muted-panel rounded-lg p-3">
                    <p className="label-muted">Timeline</p>
                    <p className="mt-2 text-sm font-semibold text-ink-900 dark:text-white">{job.duration || 'Flexible'}</p>
                  </div>
                  <div className="muted-panel rounded-lg p-3">
                    <p className="label-muted">Status</p>
                    <p className="mt-2 text-sm font-semibold text-ink-900 dark:text-white">
                      {hasSubmitted ? 'Proposal sent' : 'Open'}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 p-6 pt-0">
                {hasSubmitted ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-3 dark:border-emerald-400/20 dark:bg-emerald-400/10">
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Proposal submitted</p>
                    <p className="mt-0.5 text-sm text-emerald-600 dark:text-emerald-400">
                      Your application is under review. You will be notified if shortlisted.
                    </p>
                  </div>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant={isOpen ? 'secondary' : 'default'}
                      className="w-full"
                      onClick={() => toggleExpand(jobKey, hasSubmitted)}
                      aria-expanded={isOpen}
                    >
                      {isOpen ? (
                        <>
                          <ChevronUp size={16} />
                          Hide application form
                        </>
                      ) : (
                        <>
                          <SendHorizonal size={16} />
                          Apply for this role
                        </>
                      )}
                    </Button>

                    {isOpen ? (
                      <div className="space-y-4 rounded-lg border border-ink-200 bg-ink-50/60 p-4 dark:border-ink-dark-border dark:bg-white/4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500 dark:text-ink-300">
                              Proposed budget
                            </label>
                            <Input
                              placeholder="e.g. 500"
                              type="number"
                              min={0}
                              value={draft.budget}
                              onChange={(e) => setDraftField(jobKey, 'budget', e.target.value)}
                              disabled={proposalMutation.isPending}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500 dark:text-ink-300">
                              Timeline
                            </label>
                            <Input
                              placeholder="e.g. 2 weeks"
                              value={draft.timeline}
                              onChange={(e) => setDraftField(jobKey, 'timeline', e.target.value)}
                              disabled={proposalMutation.isPending}
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500 dark:text-ink-300">
                            Cover letter <span className="text-rose-500">*</span>
                          </label>
                          <Textarea
                            placeholder="Explain why you are a strong fit for this role. Mention relevant experience and what you will deliver."
                            value={draft.details}
                            onChange={(e) => setDraftField(jobKey, 'details', e.target.value)}
                            disabled={proposalMutation.isPending}
                            rows={5}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500 dark:text-ink-300">
                            Portfolio links
                          </label>
                          <Input
                            placeholder="https://github.com/you or https://portfolio.com"
                            value={draft.portfolio}
                            onChange={(e) => setDraftField(jobKey, 'portfolio', e.target.value)}
                            disabled={proposalMutation.isPending}
                          />
                        </div>

                        <Button
                          type="button"
                          onClick={() => handleSubmitProposal(jobKey)}
                          disabled={proposalMutation.isPending || isFetching}
                          className="w-full"
                        >
                          <SendHorizonal size={16} />
                          {proposalMutation.isPending ? 'Submitting…' : 'Submit proposal'}
                        </Button>
                      </div>
                    ) : null}
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default JobList;
