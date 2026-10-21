import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Mic,
  MonitorUp,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { toast } from 'sonner';

import { getSkills, getStudentProfile, getMyInterviewSessions } from '@/services/api';
import useAuth from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { startInterviewSession } from '@/features/ai-interview/services/interviewApi';
import { cn } from '@/lib/utils';
import { getCategoryMeta, groupSkillsByCategory, isPracticalCategory } from '@/lib/skillCategories';

type Filter = 'all' | 'verified' | 'pending';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const chipClass = (active: boolean) =>
  cn(
    'rounded-[8px] border px-2.5 py-1.5 text-[12.5px] font-semibold transition',
    active
      ? 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/35 dark:bg-brand-500/15 dark:text-brand-200'
      : 'border-ink-200 bg-ink-50 text-ink-600 hover:border-brand-200 hover:text-brand-700 dark:border-ink-dark-border dark:bg-white/[0.045] dark:text-ink-300'
  );
function scoreRing(score: number | null) {
  const value = typeof score === 'number' ? Math.max(0, Math.min(100, score)) : 0;
  return `conic-gradient(#6366f1 ${value}%, var(--ring-track) 0)`;
}

const SkillVerification: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [startingSkillId, setStartingSkillId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const userId = user?._id || user?.id;

  const { data: profile } = useQuery({
    queryKey: ['student', 'profile', userId],
    queryFn: () => getStudentProfile(userId),
    enabled: !!userId,
  });

  const { data: mySessions } = useQuery({
    queryKey: ['my-interview-sessions'],
    queryFn: getMyInterviewSessions,
    enabled: !!userId,
  });

  const getLatestSessionId = (skillId: string, skillName: string) => {
    const sessions = (mySessions || []).filter(
      (s: any) =>
        s.status === 'completed' &&
        (
          String(s.skillRef?._id || s.skillRef) === String(skillId) ||
          String(s.skill || '').trim().toLowerCase() === String(skillName || '').trim().toLowerCase()
        )
    );
    return sessions[0]?._id || null;
  };

  const verifiedSkillIds = useMemo<Set<string>>(
    () => new Set<string>((profile?.verifiedSkills || []).map((s: any) => String(s.skill?._id || s.skill))),
    [profile?.verifiedSkills]
  );

  const getVerifiedScore = (skillId: string) => {
    const found = (profile?.verifiedSkills || []).find(
      (s: any) => String(s.skill?._id || s.skill) === skillId
    );
    return typeof found?.score === 'number' ? found.score : null;
  };

  const { data: skills, isLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: getSkills,
  });

  const skillList = skills || [];

  const categoryChips = useMemo(
    () => groupSkillsByCategory(skillList).map(({ meta, skills: items }) => ({ meta, count: items.length })),
    [skillList]
  );

  const visibleSkills = useMemo(() => {
    let list = skillList;
    if (filter === 'verified') {
      list = list.filter((skill: any) => verifiedSkillIds.has(String(skill._id)));
    } else if (filter === 'pending') {
      list = list.filter((skill: any) => !verifiedSkillIds.has(String(skill._id)));
    }
    if (categoryFilter !== 'all') {
      list = list.filter((skill: any) => getCategoryMeta(skill.category).key === categoryFilter);
    }
    return list;
  }, [filter, categoryFilter, skillList, verifiedSkillIds]);

  const groupedVisibleSkills = useMemo(() => groupSkillsByCategory(visibleSkills), [visibleSkills]);

  const verifiedScores = (profile?.verifiedSkills || [])
    .map((item: any) => (typeof item.score === 'number' ? item.score : null))
    .filter((score: number | null): score is number => score !== null);
  const verifiedCount = verifiedSkillIds.size;
  const averageScore = verifiedScores.length
    ? Math.round(verifiedScores.reduce((sum: number, score: number) => sum + score, 0) / verifiedScores.length)
    : 0;
  const pendingCount = Math.max(0, skillList.length - verifiedCount);
  const recommendedSkill = skillList.find((skill: any) => !verifiedSkillIds.has(String(skill._id)));

  const { mutateAsync: beginInterview, isPending } = useMutation({
    mutationFn: (payload: { skill: string; skillId: string }) => startInterviewSession(payload),
  });

  const handleStartInterview = async (skill: { _id: string; name: string }) => {
    if (isPending) return;
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      toast.error('AI interviews currently require a desktop or laptop for camera, microphone, and full-screen sharing.');
      return;
    }
    try {
      setStartingSkillId(skill._id);
      const response = await beginInterview({ skill: skill.name, skillId: skill._id });
      navigate(`/student/ai-interview/${response.sessionId}`);
    } catch {
      toast.error('Failed to start interview. Please try again.');
      setStartingSkillId(null);
    }
  };

  return (
    <motion.div className="space-y-6" initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeUp} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          eyebrow="Mandatory verification"
          title="Verify your skills"
          description="Short AI-guided interviews that turn your skills into trusted, verified badges clients can rely on."
        />

        <div className="sh-panel flex shrink-0 items-center gap-5 px-5 py-4 sm:gap-7">
          <div>
            <div className="sh-number text-xl text-emerald-600 dark:text-emerald-300">{verifiedCount}</div>
            <div className="mt-0.5 text-xs text-ink-500 dark:text-ink-dark-muted">Verified</div>
          </div>
          <div className="h-10 w-px bg-ink-100 dark:bg-ink-dark-border" />
          <div>
            <div className="sh-number text-xl text-ink-900 dark:text-white">{averageScore || '-'}</div>
            <div className="mt-0.5 text-xs text-ink-500 dark:text-ink-dark-muted">Avg score</div>
          </div>
          <div className="h-10 w-px bg-ink-100 dark:bg-ink-dark-border" />
          <div>
            <div className="sh-number text-xl text-brand-600 dark:text-brand-300">{pendingCount}</div>
            <div className="mt-0.5 text-xs text-ink-500 dark:text-ink-dark-muted">Remaining</div>
          </div>
        </div>
      </motion.div>

      <div className="grid items-start gap-[22px] xl:grid-cols-[minmax(0,1fr)_320px]">
        <motion.section variants={fadeUp} className="min-w-0">
                    <div className="sh-panel mb-4 space-y-[18px] p-[18px]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink-900 dark:text-white">Filters</span>
              {filter !== 'all' || categoryFilter !== 'all' ? (
                <button
                  type="button"
                  onClick={() => {
                    setFilter('all');
                    setCategoryFilter('all');
                  }}
                  className="text-xs font-semibold text-brand-600 transition hover:text-brand-700"
                >
                  Reset
                </button>
              ) : null}
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-400 dark:text-ink-dark-muted">Status</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'All skills' },
                  { key: 'verified', label: 'Verified' },
                  { key: 'pending', label: 'Not verified' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={filter === item.key}
                    onClick={() => setFilter(item.key as Filter)}
                    className={chipClass(filter === item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {categoryChips.length > 1 ? (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-400 dark:text-ink-dark-muted">Category</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    aria-pressed={categoryFilter === 'all'}
                    onClick={() => setCategoryFilter('all')}
                    className={chipClass(categoryFilter === 'all')}
                  >
                    All
                  </button>
                  {categoryChips.map(({ meta }) => (
                    <button
                      key={meta.key}
                      type="button"
                      aria-pressed={categoryFilter === meta.key}
                      onClick={() => setCategoryFilter(meta.key)}
                      className={chipClass(categoryFilter === meta.key)}
                    >
                      {meta.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-[104px] rounded-2xl" />
              ))}
            </div>
          ) : skillList.length === 0 ? (
            <EmptyState title="No skills available" description="Verification tracks will appear here once the skill library is ready." />
          ) : visibleSkills.length === 0 ? (
            <EmptyState title="No skills in this view" description="Try another verification filter." />
          ) : (
            <motion.div
              className="space-y-6"
              variants={stagger}
              initial="hidden"
              animate="visible"
              key={`${filter}-${categoryFilter}`}
            >
              {groupedVisibleSkills.map(({ meta, skills: groupSkills }) => (
                <section key={meta.key} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-md border', meta.badge)}>
                      <meta.icon size={13} />
                    </span>
                    <h2 className="m-0 text-sm font-semibold text-ink-900 dark:text-white">{meta.label}</h2>
                    <span className="text-xs text-ink-400">{groupSkills.length}</span>
                  </div>

                  {groupSkills.map((skill: any) => {
                    const skillId = String(skill._id);
                    const verified = verifiedSkillIds.has(skillId);
                    const score = getVerifiedScore(skillId);
                    const starting = isPending && startingSkillId === skillId;
                    const practical = isPracticalCategory(skill.category);
                    const RowIcon = practical ? MonitorUp : Mic;

                    return (
                      <motion.article
                        key={skillId}
                        variants={fadeUp}
                        className="sh-panel flex flex-col gap-4 px-[18px] py-4 transition hover:-translate-y-0.5 hover:border-brand-200 dark:hover:border-brand-500/40 sm:flex-row sm:items-center"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                          <RowIcon size={19} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="m-0 min-w-0 text-[15.5px] font-semibold tracking-[-0.01em] text-ink-900 [overflow-wrap:anywhere] dark:text-white">
                              {skill.name}
                            </h3>
                            {verified ? (
                              <Badge variant="success" className="normal-case tracking-normal">
                                <CheckCircle2 size={10} /> Verified
                              </Badge>
                            ) : (
                              <Badge variant="subtle" className="normal-case tracking-normal">
                                Not verified
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 line-clamp-2 text-[13px] leading-6 text-ink-600 [overflow-wrap:anywhere] dark:text-ink-300">
                            {skill.description || 'No description provided.'}
                          </p>
                          <div className="mt-1 text-[11.5px] text-ink-500 dark:text-ink-dark-muted">
                            {practical
                              ? '3 questions · includes a short screen demo'
                              : '3 questions · live with Shaghalny AI'}
                          </div>
                        </div>

                        {verified ? (
                          <div className="flex shrink-0 items-center gap-3 sm:justify-end">
                            <div
                              className="flex h-[38px] w-[38px] items-center justify-center rounded-full"
                              style={{ background: scoreRing(score) }}
                            >
                              <span className="sh-number flex h-[29px] w-[29px] items-center justify-center rounded-full bg-white text-[11px] text-ink-900 dark:bg-ink-dark-surface dark:text-white">
                                {score ?? '-'}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                const sessionId = getLatestSessionId(skillId, String(skill.name || ''));
                                if (sessionId) {
                                  navigate(`/student/ai-interview/${sessionId}/result`);
                                } else {
                                  navigate('/student/profile');
                                }
                              }}
                            >
                              View result
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            className="shrink-0 sm:self-center"
                            onClick={() => handleStartInterview(skill)}
                            disabled={starting}
                          >
                            {starting ? 'Starting...' : 'Start interview'}
                            {!starting ? <ArrowRight size={16} /> : null}
                          </Button>
                        )}
                      </motion.article>
                    );
                  })}
                </section>
              ))}
            </motion.div>
          )}
        </motion.section>

        <motion.aside variants={fadeUp} className="space-y-4 xl:sticky xl:top-[88px]">
          <section className="sh-panel p-5">
            <h3 className="mb-4 text-sm font-semibold text-ink-900 dark:text-white">How it works</h3>
            <div className="space-y-4">
              {[
                {
                  title: 'AI-guided interview',
                  body: 'Shaghalny AI leads a short, structured session.',
                  icon: Sparkles,
                },
                {
                  title: 'Manual review',
                  body: 'Admins can verify results before the badge is final.',
                  icon: ShieldCheck,
                },
                {
                  title: 'Verified badge',
                  body: 'The badge boosts your profile and proposal credibility.',
                  icon: BadgeCheck,
                },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-900 dark:text-white">
                        <Icon size={13} className="text-brand-500" />
                        {item.title}
                      </div>
                      <div className="mt-1 text-[12.5px] leading-5 text-ink-500 dark:text-ink-dark-muted">{item.body}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="flex gap-3 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/25 dark:bg-amber-500/10">
            <TriangleAlert size={17} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" />
            <div className="text-[12.5px] font-medium leading-5 text-amber-700 dark:text-amber-200">
              Use a desktop or laptop. The live flow needs camera, microphone, and full-screen sharing.
            </div>
          </section>

          <section className="relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#4f46e5,#6366f1_60%,#818cf8)] p-5 text-white shadow-glass">
            <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.22),transparent_70%)]" />
            <div className="relative">
              <div className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.12em] text-[#dcdcff]">Recommended next</div>
              <div className="text-[17px] font-bold tracking-[-0.01em]">
                {recommendedSkill?.name || 'All skills verified'}
              </div>
              <div className="mt-1 text-[12.5px] leading-5 text-[#e4e4ff]">
                {recommendedSkill
                  ? `Verifying ${recommendedSkill.name} improves your profile signal for matching jobs.`
                  : 'Your verified skills are ready to support stronger proposals.'}
              </div>
              {recommendedSkill ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 border-0 bg-white text-brand-600 hover:bg-white hover:text-brand-700"
                  onClick={() => handleStartInterview(recommendedSkill)}
                  disabled={isPending && startingSkillId === String(recommendedSkill._id)}
                >
                  Start now <ArrowRight size={15} />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 border-0 bg-white text-brand-600 hover:bg-white hover:text-brand-700"
                  onClick={() => navigate('/student/jobs')}
                >
                  Browse jobs <ArrowRight size={15} />
                </Button>
              )}
            </div>
          </section>

          <section className="sh-panel flex items-start gap-3 p-4">
            <MonitorUp size={17} className="mt-0.5 shrink-0 text-brand-500" />
            <div>
              <div className="text-sm font-semibold text-ink-900 dark:text-white">Interview setup</div>
              <p className="mt-1 text-[12.5px] leading-5 text-ink-500 dark:text-ink-dark-muted">
                Keep camera, microphone, and full-screen sharing ready before starting.
              </p>
            </div>
          </section>
        </motion.aside>
      </div>
    </motion.div>
  );
};

export default SkillVerification;