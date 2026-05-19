import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCircle, DollarSign, ExternalLink, User } from 'lucide-react';
import { toast } from 'sonner';

import {
  acceptProposal, getClientJobs, getClientProposals, getJobProposals, getSkills,
} from '@/services/api';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

const statusVariant: Record<string, 'success' | 'brand' | 'danger' | 'warning'> = {
  accepted: 'success',
  shortlisted: 'brand',
  rejected: 'danger',
};

const ViewProposals: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [selectedJob, setSelectedJob] = useState<string>(searchParams.get('jobId') || '');
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [budgetDrafts, setBudgetDrafts] = useState<Record<string, string>>({});

  const { data: jobs, isLoading: jobsLoading } = useQuery({ queryKey: ['client', 'jobs'], queryFn: getClientJobs });
  const { data: skills, isLoading: skillsLoading } = useQuery({ queryKey: ['skills'], queryFn: getSkills });

  useEffect(() => { setSelectedJob(searchParams.get('jobId') || ''); }, [searchParams]);

  const { data: proposals, isLoading: proposalsLoading } = useQuery({
    queryKey: ['client', 'proposals', selectedJob],
    queryFn: () => (selectedJob ? getJobProposals(selectedJob) : getClientProposals()),
  });
const [matchScores, setMatchScores] = useState<Record<string, number>>({});

const fetchMatchScore = async (proposal: any, job: any) => {
  if (!job || matchScores[proposal._id] !== undefined) return;
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/ai/match-score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ proposal, job })
    });
    const data = await response.json();
    setMatchScores(prev => ({ ...prev, [proposal._id]: data.score }));
  } catch {
    console.error('Failed to fetch match score');
  }
};
  const filteredProposals = useMemo(() => {
    const base = proposals || [];
    return base.filter((p: any) => {
      if (!selectedSkill) return true;
      return p.studentId?.verifiedSkills?.some((v: any) => (v.skill?._id || v.skill) === selectedSkill);
    });
  }, [proposals, selectedSkill]);

  const acceptMutation = useMutation({
    mutationFn: ({ proposalId, agreedBudget }: { proposalId: string; agreedBudget?: number }) => acceptProposal(proposalId, { agreedBudget }),
    onSuccess: (data: any) => {
      toast.success('Proposal accepted. Escrow funded.');
      queryClient.invalidateQueries({ queryKey: ['client', 'proposals'] });
      queryClient.invalidateQueries({ queryKey: ['client', 'jobs'] });
      if (data?.contract?._id) navigate(`/contracts/${data.contract._id}`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to accept proposal.');
    },
  });

  return (
    <motion.div className="space-y-8" initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}>
      <motion.div variants={fadeUp}>
        <PageHeader
          eyebrow="Client workspace"
          title="Review proposals"
          description="Compare applicants and move the right student into contract."
        />
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp}>
        <Card>
          <CardContent className="grid gap-4 p-5 md:grid-cols-2">
            <div className="mt-4 space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-500 dark:text-ink-400">Filter by job</label>
              {jobsLoading ? (
                <Skeleton className="h-9 w-full rounded-lg" />
              ) : (
                <Select value={selectedJob} onChange={(e) => setSelectedJob(e.target.value)}>
                  <option value="">All jobs</option>
                  {(jobs || []).map((job: any) => (
                    <option key={job._id} value={job._id}>{job.title}</option>
                  ))}
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-500 dark:text-ink-400">Filter by verified skill</label>
              {skillsLoading ? (
                <Skeleton className="h-9 w-full rounded-lg" />
              ) : (
                <Select value={selectedSkill} onChange={(e) => setSelectedSkill(e.target.value)}>
                  <option value="">All skills</option>
                  {(skills || []).map((skill: any) => (
                    <option key={skill._id} value={skill._id}>{skill.name}</option>
                  ))}
                </Select>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Proposals grid */}
      {proposalsLoading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 w-full rounded-xl" />)}
        </div>
      ) : filteredProposals.length === 0 ? (
        <EmptyState title="No proposals match" description="Change the job or skill filter to reveal more applicants." />
      ) : (
        <motion.div className="grid gap-4 xl:grid-cols-2" variants={stagger} initial="hidden" animate="visible">
          {filteredProposals.map((proposal: any) => {
            const statusValue = proposal.status || 'submitted';
            const displayStatus = statusValue === 'pending' ? 'submitted' : statusValue;
            const isAccepted = statusValue === 'accepted';

            return (
              <motion.div key={proposal._id} variants={fadeUp}>
                <Card className={`overflow-hidden p-0 transition-all duration-200 ${isAccepted ? 'border-accent-200 dark:border-accent-700/40' : 'hover:-translate-y-0.5 hover:shadow-card'}`}>
                  {isAccepted && (
                    <div className="flex items-center gap-2 border-b border-accent-200 bg-accent-50 px-5 py-2.5 dark:border-accent-700/30 dark:bg-accent-900/15">
                      <CheckCircle size={14} className="text-accent-600 dark:text-accent-400" />
                      <span className="text-xs font-semibold text-accent-700 dark:text-accent-300">Accepted — contract created</span>
                    </div>
                  )}

                  <CardHeader className="gap-0 space-y-0 px-5 pb-3 pt-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11 shrink-0">
                          <AvatarFallback>{getInitials(proposal.studentId?.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-ink-900 dark:text-white">{proposal.studentId?.name || 'Student'}</p>
                          <p className="text-xs text-ink-500 dark:text-ink-400">{proposal.studentId?.email || '—'}</p>
                        </div>
                      </div>
                      <Badge variant={statusVariant[statusValue] ?? 'warning'}>{displayStatus}</Badge>
                    </div>
                  </CardHeader>

                  <Separator />

                  <CardContent className="space-y-4 px-5 py-4">
                    {/* Job + budget */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-ink-200 bg-ink-50 p-3 dark:border-ink-dark-border dark:bg-white/5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Job</p>
                        <p className="mt-1 text-sm font-semibold text-ink-900 dark:text-white">{proposal.jobId?.title || '—'}</p>
                      </div>
                      <div className="rounded-lg border border-ink-200 bg-ink-50 p-3 dark:border-ink-dark-border dark:bg-white/5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Proposed budget</p>
                        <p className="mt-1 text-sm font-semibold text-ink-900 dark:text-white">
                          {proposal.proposedBudget ? `$${proposal.proposedBudget}` : 'Not specified'}
                        </p>
                      </div>
                    </div>

                    {/* Verified skills */}
                    {(proposal.studentId?.verifiedSkills || []).length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Verified skills</p>
                        <div className="flex flex-wrap gap-1.5">
                          {proposal.studentId.verifiedSkills.map((v: any) => (
                            <Badge key={v.skill?._id || v.skill} variant="brand">
                              {v.skill?.name || v.skill}{v.score != null ? ` · ${v.score}` : ''}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cover letter */}
                    {proposal.details && (
                      <div className="rounded-lg border border-dashed border-ink-200 bg-ink-50/80 p-4 text-sm text-ink-700 dark:border-white/10 dark:bg-white/5 dark:text-ink-300">
                        <p className="line-clamp-4">{proposal.details}</p>
                      </div>
                    )}

                    {/* Actions */}
                    {!isAccepted && (
                      <div className="space-y-3">
                        <Separator />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Agreed budget</label>
                            <Input
                              type="number"
                              min={0}
                              placeholder={proposal.proposedBudget ? String(proposal.proposedBudget) : 'Enter amount'}
                              value={budgetDrafts[proposal._id] ?? proposal.proposedBudget ?? ''}
                              onChange={(e) => setBudgetDrafts((p) => ({ ...p, [proposal._id]: e.target.value }))}
                              disabled={acceptMutation.isPending}
                            />
                          </div>
                          <div className="flex items-end">
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => proposal.studentId?._id ? navigate(`/students/${proposal.studentId._id}?jobId=${proposal.jobId?._id}`) : null}
                            >
                              <User size={13} />
                              View profile
                            </Button>
                          </div>
                        </div>
                        <Button
                          className="w-full"
                          disabled={acceptMutation.isPending}
                          onClick={() => {
                            const draft = budgetDrafts[proposal._id];
                            const value = draft ? Number(draft) : proposal.proposedBudget;
                            if (!Number.isFinite(value) || value <= 0) {
                              toast.error('Enter a valid agreed budget.');
                              return;
                            }
                            acceptMutation.mutate({ proposalId: proposal._id, agreedBudget: value });
                          }}
                        >
                          <DollarSign size={14} />
                          {acceptMutation.isPending ? 'Funding escrow...' : 'Accept and fund escrow'}
                        </Button>
                      </div>
                    )}

                    {isAccepted && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate('/client/contracts')}
                      >
                        <ExternalLink size={13} />
                        View contract
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
};

export default ViewProposals;
