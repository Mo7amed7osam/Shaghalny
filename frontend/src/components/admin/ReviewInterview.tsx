import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getInterviewById, reviewInterview } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const ReviewInterview: React.FC = () => {
  const { interviewId } = useParams();
  const navigate = useNavigate();

  const [score, setScore] = useState<string>('');
  const [status, setStatus] = useState<string>('pass');

  const { data: interview, isLoading, isError } = useQuery({
    queryKey: ['admin', 'interview', interviewId],
    queryFn: () => getInterviewById(interviewId as string),
    enabled: !!interviewId,
  });

  useEffect(() => {
    if (!interview) return;
    setScore(interview.finalScore === null || interview.finalScore === undefined ? '' : String(interview.finalScore));
    setStatus(interview.reviewStatus === 'pass' || interview.reviewStatus === 'fail' ? interview.reviewStatus : 'pass');
  }, [interview]);

  const reviewMutation = useMutation({
    mutationFn: () => reviewInterview(interviewId as string, { status, score: score === '' ? undefined : Number(score) }),
    onSuccess: () => {
      toast.success('Interview reviewed successfully.');
      navigate('/admin/dashboard');
    },
  });

  const toAbsoluteUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
    const origin = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
    return `${origin}${path}`;
  };

  if (isLoading) {
    return <Skeleton className="h-80 w-full rounded-xl" />;
  }

  if (isError || !interview) {
    return (
      <Card className="border-dashed">
        <CardContent className="space-y-4 py-10 text-center">
          <p className="text-sm text-ink-500 dark:text-ink-300">Interview not found.</p>
          <Button variant="outline" onClick={() => navigate('/admin/dashboard')}>
            Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Interview review"
        title={
          <>
            {interview.user?.name} <span className="text-brand-600 dark:text-brand-300">· {interview.skillRef?.name || interview.skill}</span>
          </>
        }
        description="Review the captured screen and camera responses, compare them with AI signals, and record the final decision."
        actions={
          <Badge
            variant={
              interview.reviewStatus === 'pass'
                ? 'success'
                : interview.reviewStatus === 'fail'
                  ? 'danger'
                  : 'warning'
            }
          >
            {interview.reviewStatus || 'pending'}
          </Badge>
        }
      />

      <div className="space-y-5">
        {(interview.answers || []).map((response: any, index: number) => (
          <Card key={response.answerId || index}>
            <CardContent className="space-y-6 p-6">
              <div className="space-y-2">
                <p className="page-eyebrow">Question {index + 1}</p>
                <h2 className="text-2xl font-semibold">{response.question}</h2>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-xl border border-ink-200 bg-black dark:border-white/10">
                    <video className="aspect-video w-full object-cover" controls src={toAbsoluteUrl(response.screenVideoUrl || response.videoUrl)} />
                  </div>

                  {response.cameraVideoUrl ? (
                    <div className="overflow-hidden rounded-xl border border-ink-200 bg-black dark:border-white/10">
                      <video className="aspect-video w-full object-cover" controls src={toAbsoluteUrl(response.cameraVideoUrl)} />
                    </div>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="muted-panel rounded-lg p-4">
                      <p className="label-muted">AI score</p>
                      <p className="mt-2 text-lg font-semibold text-ink-900 dark:text-white">{response.score ?? 'Pending manual review'}</p>
                    </div>
                    <div className="muted-panel rounded-lg p-4">
                      <p className="label-muted">AI recommendation</p>
                      <div className="mt-2">
                        <Badge variant={response.recommendation === 'pass' ? 'success' : response.recommendation === 'fail' ? 'danger' : 'warning'}>
                          {response.recommendation}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-dashed border-ink-200 bg-ink-50/80 p-4 text-sm text-ink-700 dark:border-white/10 dark:bg-white/5 dark:text-ink-200">
                    {response.feedback}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-ink-900 dark:text-white">Strengths</p>
                      <ul className="space-y-2 text-sm text-ink-600 dark:text-ink-200">
                        {(response.strengths?.length ? response.strengths : ['None captured.']).map((item: string) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-ink-900 dark:text-white">Weaknesses</p>
                      <ul className="space-y-2 text-sm text-ink-600 dark:text-ink-200">
                        {(response.weaknesses?.length ? response.weaknesses : ['None captured.']).map((item: string) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-ink-900 dark:text-white">Transcript</p>
                    <div className="rounded-lg border border-dashed border-ink-200 bg-ink-50/80 p-4 text-sm text-ink-700 dark:border-white/10 dark:bg-white/5 dark:text-ink-200">
                      {response.transcript || 'Transcript unavailable. Manual review required.'}
                    </div>
                  </div>

                  {response.processingError ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                      {response.processingError}
                    </div>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="grid gap-5 p-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-ink-700 dark:text-ink-200">Score (0-100)</label>
            <Input type="number" min="0" max="100" value={score} onChange={(e) => setScore(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-ink-700 dark:text-ink-200">Decision</label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="pass">Approve (Pass)</option>
              <option value="fail">Reject (Fail)</option>
            </Select>
          </div>

          <div className="space-y-3 md:col-span-2">
            <p className="text-sm text-ink-500 dark:text-ink-300">
              AI final recommendation: {interview.finalRecommendation || 'needs_review'}
            </p>
            <Button onClick={() => reviewMutation.mutate()} disabled={reviewMutation.isPending || interview.status !== 'completed'}>
              {reviewMutation.isPending ? 'Submitting...' : 'Submit decision'}
            </Button>
            {interview.status !== 'completed' ? (
              <p className="text-sm text-ink-500 dark:text-ink-300">This interview is not completed yet.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReviewInterview;
