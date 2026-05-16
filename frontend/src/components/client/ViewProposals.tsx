import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  acceptProposal,
  getClientJobs,
  getClientProposals,
  getJobProposals,
  getSkills,
} from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const ViewProposals: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [selectedJob, setSelectedJob] = useState<string>(searchParams.get('jobId') || '');
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [budgetDrafts, setBudgetDrafts] = useState<Record<string, string>>({});

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['client', 'jobs'],
    queryFn: getClientJobs,
  });

  useEffect(() => {
    setSelectedJob(searchParams.get('jobId') || '');
  }, [searchParams]);

  const { data: skills, isLoading: skillsLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: getSkills,
  });

  const { data: proposals, isLoading: proposalsLoading } = useQuery({
    queryKey: ['client', 'proposals', selectedJob],
    queryFn: () => (selectedJob ? getJobProposals(selectedJob) : getClientProposals()),
  });

  const filteredProposals = useMemo(() => {
    const base = proposals || [];
    return base.filter((proposal: any) => {
      if (!selectedSkill) return true;
      return proposal.studentId?.verifiedSkills?.some((verified: any) => (verified.skill?._id || verified.skill) === selectedSkill);
    });
  }, [proposals, selectedSkill]);

  const acceptMutation = useMutation({
    mutationFn: ({ proposalId, agreedBudget }: { proposalId: string; agreedBudget?: number }) => acceptProposal(proposalId, { agreedBudget }),
    onSuccess: (data: any) => {
      toast.success('Proposal accepted. Escrow funded.');
      queryClient.invalidateQueries({ queryKey: ['client', 'proposals'] });
      queryClient.invalidateQueries({ queryKey: ['client', 'jobs'] });
      if (data?.contract?._id) {
        navigate(`/contracts/${data.contract._id}`);
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to accept proposal.');
    },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Client workspace"
        title="Review proposals"
        description="Compare skills, pricing, and fit clearly before you move the right student into contract."
      />

      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-ink-700 dark:text-ink-200">Job</label>
            {jobsLoading ? (
              <Skeleton className="h-11 w-full rounded-2xl" />
            ) : (
              <Select value={selectedJob} onChange={(e) => setSelectedJob(e.target.value)}>
                <option value="">All jobs</option>
                {(jobs || []).map((job: any) => (
                  <option key={job._id} value={job._id}>
                    {job.title}
                  </option>
                ))}
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-ink-700 dark:text-ink-200">Verified skill</label>
            {skillsLoading ? (
              <Skeleton className="h-11 w-full rounded-2xl" />
            ) : (
              <Select value={selectedSkill} onChange={(e) => setSelectedSkill(e.target.value)}>
                <option value="">All skills</option>
                {(skills || []).map((skill: any) => (
                  <option key={skill._id} value={skill._id}>
                    {skill.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {proposalsLoading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[24rem] w-full rounded-3xl" />
          ))}
        </div>
      ) : filteredProposals.length === 0 ? (
        <EmptyState title="No proposals match the current filters" description="Change the selected job or skill to reveal more applicants." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredProposals.map((proposal: any) => {
            const statusValue = proposal.status || 'submitted';
            const displayStatus = statusValue === 'pending' ? 'submitted' : statusValue;

            return (
              <Card key={proposal._id} className="overflow-hidden p-0">
                <CardContent className="space-y-5 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-semibold">{proposal.studentId?.name || 'Student'}</h2>
                      <p className="text-sm text-ink-500 dark:text-ink-300">{proposal.studentId?.email || '—'}</p>
                    </div>
                    <Badge
                      variant={
                        statusValue === 'accepted'
                          ? 'success'
                          : statusValue === 'rejected'
                            ? 'danger'
                            : statusValue === 'shortlisted'
                              ? 'brand'
                              : 'warning'
                      }
                    >
                      {displayStatus}
                    </Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="muted-panel rounded-2xl p-3">
                      <p className="label-muted">Job</p>
                      <p className="mt-2 text-sm font-semibold text-ink-900 dark:text-white">{proposal.jobId?.title || 'Job'}</p>
                    </div>
                    <div className="muted-panel rounded-2xl p-3">
                      <p className="label-muted">Proposed budget</p>
                      <p className="mt-2 text-sm font-semibold text-ink-900 dark:text-white">
                        {proposal.proposedBudget ? `$${proposal.proposedBudget}` : 'Not specified'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-ink-900 dark:text-white">Verified skills</p>
                    <div className="flex flex-wrap gap-2">
                      {(proposal.studentId?.verifiedSkills || []).length ? (
                        proposal.studentId.verifiedSkills.map((verified: any) => (
  <Badge key={verified.skill?._id || verified.skill} variant="brand">
    {verified.skill?.name || verified.skill}{verified.score != null ? ` · ${verified.score}` : ''}
  </Badge>
                        ))
                      ) : (
                        <Badge variant="subtle">None</Badge>
                      )}
                    </div>
                  </div>

                  {proposal.details ? (
                    <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/80 p-4 text-sm text-ink-700 dark:border-white/10 dark:bg-white/5 dark:text-ink-200">
                      {proposal.details}
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      type="number"
                      min={0}
                      placeholder="Agreed budget"
                      value={budgetDrafts[proposal._id] ?? proposal.proposedBudget ?? ''}
                      onChange={(e) => setBudgetDrafts((prev) => ({ ...prev, [proposal._id]: e.target.value }))}
                      disabled={acceptMutation.isPending}
                    />
                    <Button
                      variant="outline"
                      onClick={() =>
                        proposal.studentId?._id ? navigate(`/students/${proposal.studentId._id}?jobId=${proposal.jobId?._id}`) : null
                      }
                    >
                      View profile
                    </Button>
                  </div>

                  {statusValue !== 'accepted' ? (
                    <Button
                      disabled={acceptMutation.isPending}
                      onClick={() => {
                        const draft = budgetDrafts[proposal._id];
                        const value = draft ? Number(draft) : proposal.proposedBudget;
                        if (!Number.isFinite(value) || value <= 0) {
                          toast.error('Enter a valid agreed budget.');
                          return;
                        }
                        acceptMutation.mutate({
                          proposalId: proposal._id,
                          agreedBudget: value,
                        });
                      }}
                      className="w-full"
                    >
                      {acceptMutation.isPending ? 'Funding escrow…' : 'Accept proposal and fund escrow'}
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ViewProposals;
