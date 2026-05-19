import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowRight, Briefcase, CheckCircle2, Clock, FileText,
  PlusCircle, TrendingUp, Users,
} from 'lucide-react';

import { getClientJobs, getClientProposals } from '@/services/api';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const statusVariant: Record<string, 'success' | 'brand' | 'warning' | 'danger'> = {
  completed: 'success',
  in_progress: 'brand',
  open: 'warning',
};

const proposalVariant: Record<string, 'success' | 'brand' | 'warning' | 'danger'> = {
  accepted: 'success',
  shortlisted: 'brand',
  rejected: 'danger',
};

function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

const StatItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: boolean;
}> = ({ icon, label, value, sub, accent }) => (
  <motion.div variants={fadeUp}>
    <Card className={`flex flex-col gap-3 ${accent ? 'border-brand-200 bg-brand-50 dark:border-brand-700/40 dark:bg-brand-900/20' : ''}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent ? 'bg-brand-100 text-brand-600 dark:bg-brand-800/50 dark:text-brand-300' : 'bg-ink-100 text-ink-500 dark:bg-white/8 dark:text-ink-400'}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-500 dark:text-ink-400">{label}</p>
        <p className={`mt-1 text-2xl font-bold tracking-tight ${accent ? 'text-brand-700 dark:text-brand-300' : 'text-ink-900 dark:text-white'}`}>{value}</p>
        {sub && <p className="mt-0.5 text-xs text-ink-400 dark:text-ink-500">{sub}</p>}
      </div>
    </Card>
  </motion.div>
);

const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['client', 'jobs'],
    queryFn: getClientJobs,
  });

  const { data: proposals, isLoading: proposalsLoading } = useQuery({
    queryKey: ['client', 'proposals'],
    queryFn: getClientProposals,
  });

  const openJobs = (jobs || []).filter((j: any) => j.status === 'open');
  const activeJobs = (jobs || []).filter((j: any) => j.status === 'in_progress');
  const completedJobs = (jobs || []).filter((j: any) => j.status === 'completed');
  const recentProposals = (proposals || []).slice(0, 6);

  return (
    <motion.div className="space-y-8" initial="hidden" animate="visible" variants={stagger}>

      {/* Page header */}
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600 dark:text-brand-400">Client dashboard</p>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-white">Hiring pipeline</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">Manage your jobs, proposals, and contracts in one place.</p>
        </div>
        <Button onClick={() => navigate('/client/post-job')}>
          <PlusCircle size={15} />
          Post a job
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={stagger} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatItem
          icon={<Briefcase size={18} />}
          label="Open jobs"
          value={jobsLoading ? <Skeleton className="h-8 w-12" /> : openJobs.length}
          sub="Visible to students"
        />
        <StatItem
          icon={<TrendingUp size={18} />}
          label="Active contracts"
          value={jobsLoading ? <Skeleton className="h-8 w-12" /> : activeJobs.length}
          sub="Currently in progress"
          accent
        />
        <StatItem
          icon={<CheckCircle2 size={18} />}
          label="Completed"
          value={jobsLoading ? <Skeleton className="h-8 w-12" /> : completedJobs.length}
          sub="Delivered projects"
        />
        <StatItem
          icon={<Users size={18} />}
          label="Total proposals"
          value={proposalsLoading ? <Skeleton className="h-8 w-12" /> : (proposals || []).length}
          sub="Applications received"
        />
      </motion.div>

      {/* Jobs list */}
      <motion.div variants={fadeUp}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink-900 dark:text-white">Your jobs</h2>
            <p className="text-sm text-ink-500 dark:text-ink-400">Active listings and their proposal activity.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/client/post-job')}>
            <PlusCircle size={13} />
            Post job
          </Button>
        </div>

        {jobsLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
          </div>
        ) : (jobs || []).length === 0 ? (
          <EmptyState
            title="No jobs posted yet"
            description="Create your first listing to start receiving student proposals."
            actionLabel="Post a job"
            onAction={() => navigate('/client/post-job')}
          />
        ) : (
          <motion.div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" variants={stagger}>
            {(jobs || []).map((job: any) => (
              <motion.div key={job._id} variants={fadeUp}>
                <Card className="group flex flex-col gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                        <Briefcase size={16} />
                      </div>
                      <div>
                        <p className="font-semibold leading-snug text-ink-900 dark:text-white">{job.title}</p>
                        <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
                          {job.requiredSkills?.slice(0, 2).map((s: any) => s.name || s).join(', ')}
                          {(job.requiredSkills?.length || 0) > 2 ? ` +${job.requiredSkills.length - 2}` : ''}
                        </p>
                      </div>
                    </div>
                    <Badge variant={statusVariant[job.status] ?? 'warning'}>{job.status}</Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400">
                      <Clock size={11} />
                      {job.duration || 'Flexible'}
                    </span>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate(`/client/view-proposals?jobId=${job._id}`)}>
                      View proposals <ArrowRight size={11} />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Recent proposals */}
      <motion.div variants={fadeUp}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink-900 dark:text-white">Recent proposals</h2>
            <p className="text-sm text-ink-500 dark:text-ink-400">Latest applicants across all your listings.</p>
          </div>
          {(proposals || []).length > 0 && (
            <Button variant="outline" size="sm" onClick={() => navigate('/client/view-proposals')}>
              View all <ArrowRight size={13} />
            </Button>
          )}
        </div>

        {proposalsLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : recentProposals.length === 0 ? (
          <EmptyState title="No proposals yet" description="Once students apply, their proposals will appear here." />
        ) : (
          <motion.div className="grid gap-3 sm:grid-cols-2" variants={stagger}>
            {recentProposals.map((proposal: any) => {
              const status = proposal.status || 'submitted';
              return (
                <motion.div key={proposal._id} variants={fadeUp}>
                  <Card
                    className="flex cursor-pointer items-center gap-4 p-4 transition-all hover:-translate-y-0.5 hover:shadow-card"
                    onClick={() => navigate(`/client/view-proposals?jobId=${proposal.jobId?._id}`)}
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback>{getInitials(proposal.studentId?.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink-900 dark:text-white">{proposal.studentId?.name || 'Student'}</p>
                      <p className="truncate text-xs text-ink-500 dark:text-ink-400">{proposal.jobId?.title || 'Job'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={proposalVariant[status] ?? 'warning'} className="shrink-0">{status}</Badge>
                      {proposal.proposedBudget && (
                        <span className="text-xs font-medium text-ink-600 dark:text-ink-300">${proposal.proposedBudget}</span>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </motion.div>

      {/* Quick actions */}
      <motion.div variants={fadeUp}>
        <Card>
          <CardHeader className="mb-0">
            <CardTitle className="flex items-center gap-2">
              <FileText size={16} className="text-brand-500" />
              Quick actions
            </CardTitle>
          </CardHeader>
          <CardContent className="mt-3 flex flex-wrap gap-3">
            {[
              { label: 'Post a job', onClick: () => navigate('/client/post-job'), primary: true },
              { label: 'Review proposals', onClick: () => navigate('/client/view-proposals') },
              { label: 'View contracts', onClick: () => navigate('/client/contracts') },
              { label: 'Wallet', onClick: () => navigate('/client/wallet') },
            ].map((action) => (
              <Button
                key={action.label}
                variant={action.primary ? 'default' : 'outline'}
                size="sm"
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default ClientDashboard;
