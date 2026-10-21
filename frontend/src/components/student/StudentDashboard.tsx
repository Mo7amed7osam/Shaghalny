import { formatCurrency } from '@/lib/currency';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  Check,
  ClipboardList,
  FileText,
  Mic,
  Sparkles,
  UserRound,
  Wallet,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { getJobs, getStudentProfile, getStudentProposals } from '@/services/api';
import useAuth from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CompanyLogo, getCompanyName } from '@/components/ui/company-logo';
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const statusVariant: Record<string, 'success' | 'brand' | 'danger' | 'warning'> = {
  accepted: 'success',
  shortlisted: 'brand',
  rejected: 'danger',
};

function getProfileCompletion(profile: any, verifiedSkillsCount: number): { pct: number; missing: string[] } {
  const portfolioLinks = Array.isArray(profile?.portfolioLinks) ? profile.portfolioLinks.filter(Boolean) : [];
  const checks = [
    { label: 'Verify 1 skill', done: verifiedSkillsCount > 0 },
    { label: 'Add profile photo', done: !!profile?.profilePhotoUrl },
    { label: 'Add portfolio projects', done: portfolioLinks.length > 0 },
    { label: 'Upload your CV', done: !!profile?.cvUrl },
  ];
  const done = checks.filter((c) => c.done).length;
  return {
    pct: Math.round((done / checks.length) * 100),
    missing: checks.filter((c) => !c.done).map((c) => c.label),
  };
}

function budgetLabel(job: any) {
  if (job?.budgetMin !== undefined || job?.budgetMax !== undefined) {
    return `${job.budgetMin !== undefined ? formatCurrency(job.budgetMin) : '-'}-${job.budgetMax !== undefined ? formatCurrency(job.budgetMax) : '-'}`;
  }
  return job?.budget ? formatCurrency(job.budget) : 'Budget not set';
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function jobMatchPercent(job: any, verifiedSkillIds: Set<string>) {
  if (typeof job?.matchScore === 'number') return Math.round(job.matchScore);
  const requiredSkills = Array.isArray(job?.requiredSkills) ? job.requiredSkills : [];
  if (requiredSkills.length === 0) return null;
  const matched = requiredSkills.filter((skill: any) => verifiedSkillIds.has(String(skill?._id || skill))).length;
  return Math.round((matched / requiredSkills.length) * 100);
}

const QuickAction = ({
  title,
  meta,
  icon,
  tone,
  onClick,
}: {
  title: string;
  meta: string;
  icon: React.ReactNode;
  tone: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="sh-panel flex items-center gap-3 px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-brand-200 dark:hover:border-brand-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
  >
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${tone}`}>
      {icon}
    </span>
    <span className="min-w-0">
      <span className="block text-sm font-semibold text-ink-900 dark:text-white">{title}</span>
      <span className="block text-xs text-ink-500 dark:text-ink-dark-muted">{meta}</span>
    </span>
  </button>
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

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs', 'dashboard-recommended'],
    queryFn: () => getJobs(),
  });

  const proposalList = proposals || [];
  const appliedJobIds = new Set(proposalList.map((p: any) => p.jobId?._id || p.jobId).filter(Boolean));
  const recommendedJobs = (jobs || []).filter((job: any) => !appliedJobIds.has(job._id)).slice(0, 3);
  const verifiedSkillsCount = profile?.verifiedSkills?.length || 0;
  const balance = profile?.balance?.toFixed?.(2) ?? '0.00';
  const { pct: completionPct, missing: completionMissing } = getProfileCompletion(profile, verifiedSkillsCount);
  const firstName = user?.name?.split(' ')[0] || 'there';
  const verifiedSkillIds = new Set<string>((profile?.verifiedSkills || []).map((item: any) => String(item.skill?._id || item.skill)));
  const greeting = getGreeting();

  return (
    <motion.div className="space-y-[22px]" initial="hidden" animate="visible" variants={staggerContainer}>
      <motion.section
        variants={fadeUp}
        className="relative overflow-hidden rounded-[20px] bg-[linear-gradient(115deg,#4f46e5_0%,#6366f1_45%,#818cf8_100%)] p-6 text-white shadow-glass sm:p-7"
      >
        <div className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.25),transparent_70%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-1.5 text-[13px] font-medium text-[#dcdcff]">{greeting}, {firstName}</div>
            <h1 className="max-w-3xl text-[26px] font-bold tracking-[-0.025em] text-white">
              {verifiedSkillsCount > 0 ? 'Keep building your student freelance profile' : "You're 1 verified skill away from better matches"}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#e4e4ff]">
              Complete your verification profile to unlock stronger job matches and a higher client trust score.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-0 bg-white text-brand-600 hover:bg-white hover:text-brand-700"
            onClick={() => navigate('/student/skill-verification')}
          >
            Start AI verification <ArrowRight size={15} />
          </Button>
        </div>
      </motion.section>

      <motion.div variants={fadeUp} className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <QuickAction title="Browse jobs" meta={`${(jobs || []).length} open`} icon={<Briefcase size={18} />} tone="bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-300" onClick={() => navigate('/student/jobs')} />
        <QuickAction title="Edit profile" meta={`${profileLoading ? '...' : completionPct}% complete`} icon={<UserRound size={18} />} tone="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300" onClick={() => navigate('/student/profile')} />
        <QuickAction title="Verify skills" meta={`${verifiedSkillsCount} verified`} icon={<Mic size={18} />} tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" onClick={() => navigate('/student/skill-verification')} />
        <QuickAction title="Wallet" meta={formatCurrency(balance)} icon={<Wallet size={18} />} tone="bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300" onClick={() => navigate('/student/wallet')} />
      </motion.div>

      <div className="grid items-start gap-[22px] xl:grid-cols-[minmax(0,1fr)_340px]">
        <motion.div variants={fadeUp} className="space-y-5">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink-900 dark:text-white">Recommended for you</h2>
              <button type="button" onClick={() => navigate('/student/jobs')} className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300 dark:hover:text-brand-200">
                View all <ArrowRight size={13} className="inline" />
              </button>
            </div>

            <div className="space-y-2.5">
              {jobsLoading ? (
                Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-[70px] rounded-2xl" />)
              ) : recommendedJobs.length === 0 ? (
                <EmptyState title="No new jobs right now" description="New recommendations will appear here once clients publish matching work." />
              ) : (
                recommendedJobs.map((job: any, index: number) => {
                  const match = jobMatchPercent(job, verifiedSkillIds);
                  return (
                    <button
                      key={job._id || index}
                      type="button"
                      onClick={() => navigate('/student/jobs')}
                      className="sh-panel flex w-full items-center gap-3 px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-brand-200 dark:hover:border-brand-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <CompanyLogo job={job} className="h-10 w-10 rounded-[11px]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-semibold text-ink-900 dark:text-white">{job.title}</span>
                        <span className="block truncate text-xs text-ink-500 dark:text-ink-dark-muted">{getCompanyName(job)} · {job.duration || 'Fixed price'}</span>
                      </span>
                      <span className="text-right">
                        <span className="sh-number block text-sm text-ink-900 dark:text-white">{budgetLabel(job)}</span>
                        {match !== null ? <span className="block text-[11.5px] font-semibold text-emerald-600">{match}% match</span> : null}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="sh-panel p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink-900 dark:text-white">Recent applications</h2>
              <button type="button" onClick={() => navigate('/student/contracts')} className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300 dark:hover:text-brand-200">
                See all
              </button>
            </div>

            {proposalsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-14 rounded-xl" />)}
              </div>
            ) : proposalList.length === 0 ? (
              <p className="rounded-xl border border-dashed border-ink-200 bg-ink-50 px-4 py-4 text-center text-sm text-ink-500 dark:border-ink-dark-border dark:bg-white/[0.04]">
                Apply to jobs from the job board and your applications will appear here.
              </p>
            ) : (
              <div className="divide-y divide-ink-100 dark:divide-ink-dark-border">
                {proposalList.slice(0, 3).map((proposal: any, index: number) => (
                  <div key={proposal._id || index} className="flex items-center gap-3 py-3">
                    <CompanyLogo job={proposal.jobId} className="h-[34px] w-[34px] rounded-[9px]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-ink-900 dark:text-white">{proposal.jobId?.title || 'Job'}</span>
                      <span className="block text-xs text-ink-500 dark:text-ink-dark-muted">
                        Applied {proposal.createdAt ? new Date(proposal.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                      </span>
                    </span>
                    <Badge variant={statusVariant[proposal.status] ?? 'warning'}>{proposal.status || 'submitted'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </section>
        </motion.div>

        <motion.aside variants={fadeUp} className="space-y-4 xl:sticky xl:top-[88px]">
          <section className="sh-panel p-5">
            <div className="flex items-center gap-4">
              <div
                className="flex h-[70px] w-[70px] shrink-0 items-center justify-center rounded-full"
                style={{ background: `conic-gradient(#6366f1 ${completionPct}%, var(--ring-track) 0)` }}
              >
                <div className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-white text-[17px] font-bold text-brand-600 dark:text-brand-300 dark:bg-ink-dark-surface">
                  {profileLoading ? '...' : `${completionPct}%`}
                </div>
              </div>
              <div>
                <div className="text-[15px] font-semibold text-ink-900 dark:text-white">Profile completion</div>
                <div className="mt-0.5 text-[12.5px] leading-5 text-ink-500 dark:text-ink-dark-muted">
                  {completionPct === 100 ? 'Your profile is client-ready.' : 'Add items to reach 100% and rank higher.'}
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2.5">
              {['Verify 1 skill', 'Add profile photo', 'Add portfolio projects', 'Upload your CV'].map((item) => {
                const done = !completionMissing.includes(item);
                return (
                  <div key={item} className={`flex items-center gap-2.5 text-[13px] ${done ? 'text-ink-700 dark:text-ink-200' : 'text-ink-500 dark:text-ink-dark-muted'}`}>
                    <span className={`flex h-4 w-4 items-center justify-center rounded-[5px] ${done ? 'bg-emerald-600 text-white' : 'border border-ink-400'}`}>
                      {done ? <Check size={10} /> : null}
                    </span>
                    {item}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="sh-wallet-card">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#b7b7d6]">Available balance</span>
              <Wallet size={17} className="text-[#8b8bd6]" />
            </div>
            <div className="sh-number mt-2 text-[28px] text-white">{profileLoading ? '...' : formatCurrency(balance)}</div>
            <div className="mt-1 text-[12.5px] text-[#9a9ac9]">Ready to withdraw</div>
            <Button className="mt-4 w-full" onClick={() => navigate('/student/wallet')}>Withdraw funds</Button>
          </section>

          <section className="sh-panel p-[18px]">
            <div className="flex items-center gap-3">
              <div className="flex h-[46px] w-[46px] shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:text-brand-300 dark:bg-brand-500/15">
                <Mic size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-ink-900 dark:text-white">Skill verification</div>
                <div className="mt-0.5 text-[12.5px] text-ink-500 dark:text-ink-dark-muted">
                  {verifiedSkillsCount > 0 ? `${verifiedSkillsCount} verified skill${verifiedSkillsCount === 1 ? '' : 's'}` : 'Start your first AI interview'}
                </div>
              </div>
            </div>
            <Button variant="soft" className="mt-3 w-full" onClick={() => navigate('/student/skill-verification')}>
              Join interview
            </Button>
          </section>

          <section className="sh-panel p-[18px]">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-white">
              <CalendarDays size={16} className="text-brand-500" />
              Events and contracts
            </div>
            <div className="mt-3 grid gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/student/contracts')}><ClipboardList size={14} /> Contracts</Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/student/career-roadmap')}><Sparkles size={14} /> Career roadmap</Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/student/interview-history')}><FileText size={14} /> Interview history</Button>
            </div>
          </section>
        </motion.aside>
      </div>
    </motion.div>
  );
};

export default StudentDashboard;
