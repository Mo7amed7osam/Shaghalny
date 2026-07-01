import { formatCurrency } from '@/lib/currency';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowRight, BookOpen, Briefcase, CheckCircle2,
  Clock, Wallet, FileText, Shield, Sparkles, TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { getStudentProfile, getStudentProposals } from '@/services/api';
import useAuth from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const statusVariant: Record<string, 'success' | 'brand' | 'danger' | 'warning'> = {
  accepted: 'success',
  shortlisted: 'brand',
  rejected: 'danger',
};

function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function getProfileCompletion(profile: any, verifiedSkillsCount: number): { pct: number; missing: string[] } {
  const checks = [
    { label: 'Bio added', done: !!profile?.bio },
    { label: 'Skills verified', done: verifiedSkillsCount > 0 },
    { label: 'Portfolio links', done: !!profile?.portfolioUrl },
    { label: 'University set', done: !!profile?.university },
  ];
  const done = checks.filter((c) => c.done).length;
  return {
    pct: Math.round((done / checks.length) * 100),
    missing: checks.filter((c) => !c.done).map((c) => c.label),
  };
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
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent ? 'bg-brand-100 text-brand-600 dark:bg-brand-800/50 dark:text-brand-300' : 'bg-ink-100 text-ink-500 dark:bg-white/10 dark:text-ink-400'}`}>
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

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?._id || user?.id;

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['student', 'profile', userId],
    queryFn: () => getStudentProfile(userId),
    enabled: !!userId,
  });

  const { data: proposals, isLoading: proposalsLoading } = useQuery({
    queryKey: ['student', 'proposals', userId],
    queryFn: () => getStudentProposals(userId),
    enabled: !!userId,
  });

  const proposalList = proposals || [];
  const activeProposals = proposalList.filter((p: any) => ['submitted', 'shortlisted'].includes(p.status)).length;
  const verifiedSkillsCount = profile?.verifiedSkills?.length || 0;
  const balance = profile?.balance?.toFixed?.(2) ?? '0.00';
  const { pct: completionPct, missing: completionMissing } = getProfileCompletion(profile, verifiedSkillsCount);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <motion.div className="space-y-8" initial="hidden" animate="visible" variants={staggerContainer}>
      {/* Welcome header */}
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 ring-2 ring-brand-100 dark:ring-brand-900/40">
            <AvatarFallback className="text-lg">{getInitials(user?.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600 dark:text-brand-400">Student dashboard</p>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-white">
              Welcome back, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-sm text-ink-500 dark:text-ink-400">{today}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/student/profile')}>
            View profile
          </Button>
          <Button size="sm" onClick={() => navigate('/student/jobs')}>
            Browse jobs <ArrowRight size={14} />
          </Button>
        </div>
      </motion.div>

      {/* Stats grid */}
      <motion.div variants={staggerContainer} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatItem
          icon={<Shield size={18} />}
          label="Verified skills"
          value={profileLoading ? <Skeleton className="h-8 w-16" /> : verifiedSkillsCount}
          sub="AI-verified via interview"
        />
        <StatItem
          icon={<FileText size={18} />}
          label="Active proposals"
          value={proposalsLoading ? <Skeleton className="h-8 w-16" /> : activeProposals}
          sub="Submitted or shortlisted"
        />
        <StatItem
          icon={<Wallet size={18} />}
          label="Available balance"
          value={profileLoading ? <Skeleton className="h-8 w-16" /> : formatCurrency(balance)}
          sub="Ready to withdraw"
          accent
        />
        <StatItem
          icon={<CheckCircle2 size={18} />}
          label="Profile status"
          value={<Badge variant="success" className="text-sm normal-case tracking-normal">Active</Badge>}
          sub="Visible to clients"
        />
      </motion.div>

      {/* Middle row: profile completion + quick actions */}
      <motion.div variants={staggerContainer} className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader className="mb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-brand-500" />
                  Profile completion
                </CardTitle>
                <span className="text-sm font-bold text-brand-600 dark:text-brand-400">{profileLoading ? '...' : `${completionPct}%`}</span>
              </div>
            </CardHeader>
            <CardContent className="mt-3 space-y-4">
              {profileLoading ? (
                <Skeleton className="h-2 w-full rounded-full" />
              ) : (
                <Progress value={completionPct} />
              )}
              {!profileLoading && completionMissing.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Complete to unlock more visibility</p>
                  <div className="flex flex-wrap gap-2">
                    {completionMissing.map((item) => (
                      <span key={item} className="inline-flex items-center gap-1.5 rounded-md border border-ink-200 bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-600 dark:border-ink-dark-border dark:bg-white/5 dark:text-ink-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {!profileLoading && completionPct === 100 && (
                <p className="flex items-center gap-2 text-sm font-medium text-accent-600 dark:text-accent-400">
                  <Sparkles size={14} /> Profile complete — you're visible to all clients
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="h-full">
            <CardHeader className="mb-0">
              <CardTitle className="flex items-center gap-2">
                <Briefcase size={16} className="text-brand-500" />
                Quick actions
              </CardTitle>
            </CardHeader>
            <CardContent className="mt-3 space-y-2">
              {[
                { label: 'Browse job board', icon: <BookOpen size={14} />, path: '/student/jobs' },
                { label: 'Verify a skill', icon: <Shield size={14} />, path: '/student/skill-verification' },
                { label: 'View my wallet', icon: <Wallet size={14} />, path: '/student/wallet' },
                { label: 'My contracts', icon: <FileText size={14} />, path: '/student/contracts' },
              ].map((action) => (
                <button
                  key={action.path}
                  onClick={() => navigate(action.path)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-white/5 dark:hover:text-white"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ink-100 text-ink-500 dark:bg-white/10 dark:text-ink-400">
                    {action.icon}
                  </span>
                  {action.label}
                  <ArrowRight size={13} className="ml-auto text-ink-300 dark:text-ink-600" />
                </button>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Recent applications */}
      <motion.div variants={fadeUp}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink-900 dark:text-white">Recent applications</h2>
            <p className="text-sm text-ink-500 dark:text-ink-400">Where your proposals stand right now.</p>
          </div>
          {proposalList.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => navigate('/student/contracts')}>
              View all <ArrowRight size={13} />
            </Button>
          )}
        </div>

        {proposalsLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
          </div>
        ) : proposalList.length === 0 ? (
          <EmptyState
            title="No proposals yet"
            description="Apply to jobs from the job board and your applications will appear here."
            actionLabel="Browse jobs"
            onAction={() => navigate('/student/jobs')}
          />
        ) : (
          <motion.div
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {proposalList.slice(0, 6).map((proposal: any) => (
              <motion.div key={proposal._id} variants={fadeUp}>
                <Card className="group flex flex-col gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-1 font-semibold text-ink-900 dark:text-white">
                      {proposal.jobId?.title || 'Job'}
                    </p>
                    <Badge variant={statusVariant[proposal.status] ?? 'warning'} className="shrink-0">
                      {proposal.status || 'submitted'}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
                    <Clock size={11} />
                    Applied {proposal.createdAt ? new Date(proposal.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default StudentDashboard;
