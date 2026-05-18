import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, SendHorizonal } from 'lucide-react';
import { toast } from 'sonner';

import { fetchJobs, getStudentProposals, submitProposal } from '@/services/api';
const improveWithAI = async (jobTitle: string, currentText: string): Promise<string> => {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/ai/improve-text', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ text: currentText, jobTitle })
  });
  const data = await response.json();
  return data.improved || currentText;
};
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

const JobList: React.FC<JobListProps> = ({ embedded = false }) => {
  const [search, setSearch] = useState('');
  const [proposalDetails, setProposalDetails] = useState<Record<string, string>>({});
  const [proposalTimeline, setProposalTimeline] = useState<Record<string, string>>({});
  const [proposalPortfolio, setProposalPortfolio] = useState<Record<string, string>>({});
  const [proposalBudget, setProposalBudget] = useState<Record<string, string>>({});
  const [debouncedSearch, setDebouncedSearch] = useState('');
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
    mutationFn: ({ jobId, details, proposedBudget }: any) => submitProposal(jobId, { details, proposedBudget }),
    onSuccess: () => {
      toast.success('Proposal submitted');
      queryClient.invalidateQueries({ queryKey: ['student', 'proposals', userId] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to submit proposal');
    },
  });

  const filteredJobs = useMemo(() => jobs || [], [jobs]);

  const handleSubmitProposal = async (jobId: string) => {
    if (submittedJobIds.has(jobId)) {
      toast.error('You already submitted a proposal for this job.');
      return;
    }

    const details = proposalDetails[jobId];
    if (!details) {
      toast.error('Please enter a cover letter.');
      return;
    }

    const timeline = proposalTimeline[jobId];
    const portfolio = proposalPortfolio[jobId];
    const budget = proposalBudget[jobId];
    const parsedBudget = budget ? Number(budget) : undefined;

    if (budget && (!Number.isFinite(parsedBudget) || parsedBudget < 0)) {
      toast.error('Proposed budget must be a non-negative number.');
      return;
    }

    const composedDetails = [`Cover Letter: ${details}`, timeline ? `Timeline: ${timeline}` : null, portfolio ? `Portfolio Links: ${portfolio}` : null]
      .filter(Boolean)
      .join('\n');

    await proposalMutation.mutateAsync({
      jobId,
      details: composedDetails,
      proposedBudget: parsedBudget,
    });

    setProposalDetails((p) => ({ ...p, [jobId]: '' }));
    setProposalTimeline((p) => ({ ...p, [jobId]: '' }));
    setProposalPortfolio((p) => ({ ...p, [jobId]: '' }));
    setProposalBudget((p) => ({ ...p, [jobId]: '' }));
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

        <label className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-ink-200 bg-white/95 px-4 shadow-soft dark:border-ink-dark-border dark:bg-ink-dark-surface/88 md:max-w-sm">
          <Search size={16} className="text-ink-500 dark:text-ink-300" />
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
            <Skeleton key={i} className="h-[26rem] w-full rounded-3xl" />
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

          return (
            <Card key={jobKey} className="interactive-card overflow-hidden p-0">
              <CardHeader className="space-y-5 p-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <CardTitle className="max-w-3xl text-2xl">{job.title}</CardTitle>
                    <Badge variant={hasSubmitted ? 'success' : 'brand'}>{hasSubmitted ? 'Applied' : 'Open'}</Badge>
                  </div>

                  {skills.length ? (
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill: any) => (
                        <Badge
                          key={skill._id || skill}
                          variant="subtle"
                          className="dark:border-brand-300/18 dark:bg-[#142742] dark:text-ink-50"
                        >
                          {skill.name || skill}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  <p className="max-w-3xl text-sm text-ink-600 dark:text-ink-200">
                    {job.description}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="space-y-5 p-6 pt-0">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="muted-panel rounded-2xl p-3">
                    <p className="label-muted">Budget</p>
                    <p className="mt-2 text-sm font-semibold text-ink-900 dark:text-white">
                      {job.budgetMin !== undefined || job.budgetMax !== undefined ? `${job.budgetMin ?? '—'} - ${job.budgetMax ?? '—'}` : 'Flexible'}
                    </p>
                  </div>
                  <div className="muted-panel rounded-2xl p-3">
                    <p className="label-muted">Timeline</p>
                    <p className="mt-2 text-sm font-semibold text-ink-900 dark:text-white">{job.duration || 'Discuss on approval'}</p>
                  </div>
                  <div className="muted-panel rounded-2xl p-3">
                    <p className="label-muted">Status</p>
                    <p className="mt-2 text-sm font-semibold text-ink-900 dark:text-white">{hasSubmitted ? 'Proposal sent' : 'Ready to apply'}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    placeholder="Proposed budget (optional)"
                    type="number"
                    min={0}
                    value={proposalBudget[jobKey] || ''}
                    onChange={(e) => setProposalBudget((p) => ({ ...p, [jobKey]: e.target.value }))}
                    disabled={hasSubmitted}
                  />
                  <Input
                    placeholder="Timeline (e.g. 2 weeks)"
                    value={proposalTimeline[jobKey] || ''}
                    onChange={(e) => setProposalTimeline((p) => ({ ...p, [jobKey]: e.target.value }))}
                    disabled={hasSubmitted}
                  />
                </div>
<Textarea
  placeholder="Write a concise cover letter that explains why you fit this role."
  value={proposalDetails[jobKey] || ''}
  onChange={(e) => setProposalDetails((p) => ({ ...p, [jobKey]: e.target.value }))}
  disabled={hasSubmitted}
  rows={5}
/>
{!hasSubmitted && proposalDetails[jobKey] ? (
  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={async () => {
      const improved = await improveWithAI(job.title, proposalDetails[jobKey]);
      setProposalDetails((p) => ({ ...p, [jobKey]: improved }));
    }}
  >
    ✨ Improve with AI
  </Button>
) : null}

                <Input
                  placeholder="Portfolio links"
                  value={proposalPortfolio[jobKey] || ''}
                  onChange={(e) => setProposalPortfolio((p) => ({ ...p, [jobKey]: e.target.value }))}
                  disabled={hasSubmitted}
                />

                <Button type="button" onClick={() => handleSubmitProposal(jobKey)} disabled={proposalMutation.isPending || hasSubmitted} className="w-full">
                  <SendHorizonal size={18} />
                  {hasSubmitted
                    ? 'Proposal submitted'
                    : proposalMutation.isPending
                      ? 'Submitting...'
                      : isFetching
                        ? 'Refreshing jobs...'
                        : 'Submit proposal'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default JobList;
