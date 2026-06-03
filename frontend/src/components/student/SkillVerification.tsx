import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Sparkles, Video } from 'lucide-react';
import { toast } from 'sonner';

import { getSkills, getStudentProfile, getMyInterviewSessions } from '@/services/api';
import useAuth from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { startInterviewSession } from '@/features/ai-interview/services/interviewApi';

const SkillVerification: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [startingSkillId, setStartingSkillId] = useState<string | null>(null);
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

  const verifiedSkillIds = new Set(
    (profile?.verifiedSkills || []).map((s: any) => String(s.skill?._id || s.skill))
  );

  const getVerifiedScore = (skillId: string) => {
    const found = (profile?.verifiedSkills || []).find(
      (s: any) => String(s.skill?._id || s.skill) === skillId
    );
    return found?.score ?? null;
  };

  const { data: skills, isLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: getSkills,
  });

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

  const fadeUp = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] } } };
  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

  return (
    <motion.div className="space-y-10" initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeUp}><PageHeader
        eyebrow="Mandatory verification"
        title="Skill verification interviews"
        description="Complete short AI-guided interviews to validate your strongest skills and improve hiring confidence for clients."
      /></motion.div>

      <motion.div variants={fadeUp}>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/30 dark:bg-amber-900/15 dark:text-amber-200">
          Start the live interview from a desktop or laptop. The verification flow needs camera, microphone, and entire-screen sharing.
        </div>
      </motion.div>

      <motion.div variants={fadeUp}><section className="feature-highlight text-white">
        <CardContent className="relative grid gap-5 p-8 md:grid-cols-3 lg:p-10">
          {[
            {
              title: 'AI-guided interview',
              body: 'Gravis leads the session and keeps the process structured.',
              Icon: Video,
            },
            {
              title: 'Manual review support',
              body: 'Admins can verify results before the skill status is finalized.',
              Icon: ShieldCheck,
            },
            {
              title: 'Better marketplace trust',
              body: 'Verified skills improve your profile quality and proposal credibility.',
              Icon: Sparkles,
            },
          ].map(({ title, body, Icon }) => (
            <div key={title} className="rounded-xl border border-white/15 bg-white/10 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
                <Icon size={20} />
              </div>
              <p className="mt-5 text-xl font-semibold text-white">{title}</p>
              <p className="mt-2 text-sm leading-6 text-white/85">{body}</p>
            </div>
          ))}
        </CardContent>
      </section></motion.div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      ) : (skills || []).length === 0 ? (
        <EmptyState title="No skills available" description="Verification tracks will appear here once the skill library is ready." />
      ) : (
        <motion.div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3" variants={stagger} initial="hidden" animate="visible">
          {(skills || []).map((skill: any) => (
            <motion.div key={skill._id} variants={fadeUp}>
            <Card className="interactive-card overflow-hidden p-0">
              <CardHeader className="space-y-4 p-6">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-2xl">{skill.name}</CardTitle>
                  <Badge variant="brand">AI interview</Badge>
                </div>
                <p className="text-sm text-ink-600 dark:text-ink-200">
                  {skill.description || 'No description provided.'}
                </p>
              </CardHeader>

              <CardContent className="space-y-5 p-6 pt-0">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="muted-panel rounded-lg p-3">
                    <p className="label-muted">Interview mode</p>
                    <p className="mt-2 text-sm font-semibold text-ink-900 dark:text-white">Live with Gravis</p>
                  </div>
                  <div className="muted-panel rounded-lg p-3">
                    <p className="label-muted">Outcome</p>
                    <p className="mt-2 text-sm font-semibold text-ink-900 dark:text-white">Verified skill badge</p>
                  </div>
                </div>

                {verifiedSkillIds.has(String(skill._id)) ? (
                  <div className="space-y-3">
                    <div className="muted-panel rounded-lg p-3 text-center">
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        Verified — Score: {getVerifiedScore(String(skill._id)) ?? '—'}
                      </p>
                    </div>
                   <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      size="lg"
                      onClick={() => {
                        const sessionId = getLatestSessionId(String(skill._id), String(skill.name || ''));
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
                    className="w-full"
                    size="lg"
                    onClick={() => handleStartInterview(skill)}
                    disabled={isPending && startingSkillId === String(skill._id)}
                  >
                    {isPending && startingSkillId === String(skill._id) ? 'Starting interview…' : 'Start interview'}
                    {!(isPending && startingSkillId === String(skill._id)) ? <ArrowRight size={18} /> : null}
                  </Button>
                )}
              </CardContent>
            </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};

export default SkillVerification;
