import { formatCurrency } from '@/lib/currency';
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import useAuth from '@/hooks/useAuth';
import {
  acceptContractWork,
  getContractDetails,
  requestContractChanges,
  submitContractReview,
  submitContractWork,
} from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

const ContractDetails: React.FC = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isClient = user?.role === 'Client';
  const isStudent = user?.role === 'Student';

  const [submissionMessage, setSubmissionMessage] = useState('');
  const [submissionLinks, setSubmissionLinks] = useState('');
  const [reviewRating, setReviewRating] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [hasReviewed, setHasReviewed] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['contracts', id],
    queryFn: () => getContractDetails(id as string),
    enabled: !!id,
  });

  const submitMutation = useMutation({
    mutationFn: (payload: { message: string; links?: string[] }) => submitContractWork(id as string, payload),
    onSuccess: () => {
      toast.success('Work submitted successfully.');
      setSubmissionMessage('');
      setSubmissionLinks('');
      queryClient.invalidateQueries({ queryKey: ['contracts', id] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to submit work.');
    },
  });

  const acceptMutation = useMutation({
    mutationFn: () => acceptContractWork(id as string),
    onSuccess: () => {
      toast.success('Work accepted. Escrow released.');
      queryClient.invalidateQueries({ queryKey: ['contracts', id] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to accept work.');
    },
  });

  const requestChangesMutation = useMutation({
    mutationFn: () => requestContractChanges(id as string),
    onSuccess: () => {
      toast.success('Changes requested.');
      queryClient.invalidateQueries({ queryKey: ['contracts', id] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to request changes.');
    },
  });

  const reviewMutation = useMutation({
    mutationFn: (payload: { rating: number; comment?: string }) => submitContractReview(id as string, payload),
    onSuccess: () => {
      toast.success('Review submitted.');
      setHasReviewed(true);
      setReviewRating('');
      setReviewComment('');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to submit review.');
    },
  });

  if (isLoading) return <Skeleton className="h-80 w-full rounded-xl" />;
  if (isError || !data?.contract) return <EmptyState title="Unable to load contract" description="The contract could not be loaded right now." />;

  const { contract, submissions } = data;

  const steps = [
    { label: 'Hired', active: true },
    { label: 'Submitted', active: ['submitted', 'completed'].includes(contract.status) },
    { label: 'Accepted', active: contract.status === 'completed' },
    { label: 'Paid', active: contract.escrowStatus === 'released' },
    { label: 'Reviewed', active: hasReviewed },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Contract workspace"
        title={contract.jobId?.title || 'Contract'}
        description={`Client: ${contract.clientId?.name || 'Client'} • Student: ${contract.studentId?.name || 'Student'}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge variant="brand">{contract.status}</Badge>
            <Badge variant={contract.escrowStatus === 'released' ? 'success' : 'warning'}>{contract.escrowStatus}</Badge>
          </div>
        }
      />

      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="muted-panel rounded-lg p-4">
              <p className="label-muted">Agreed budget</p>
              <p className="mt-2 text-lg font-semibold text-ink-900 dark:text-white">{formatCurrency(contract.agreedBudget)}</p>
            </div>
            <div className="muted-panel rounded-lg p-4 md:col-span-2">
              <p className="label-muted">Progress</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {steps.map((step) => (
                  <span
                    key={step.label}
                    className={[
                      'rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]',
                      step.active
                        ? 'bg-brand-50 text-brand-800 dark:bg-brand-400/10 dark:text-brand-100'
                        : 'bg-ink-100 text-ink-600 dark:bg-white/10 dark:text-ink-200',
                    ].join(' ')}
                  >
                    {step.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-2xl font-semibold">Submissions</h2>
          {(submissions || []).length ? (
            <div className="space-y-4">
              {(submissions || []).map((submission: any) => (
                <div key={submission._id} className="muted-panel rounded-lg p-4">
                  <p className="text-sm text-ink-700 dark:text-ink-200">{submission.message}</p>
                  {(submission.links || []).length ? (
                    <div className="mt-3 space-y-1 text-sm">
                      {(submission.links || []).map((link: string, index: number) => (
                        <div key={`${link}-${index}`}>
                          <a href={link} target="_blank" rel="noreferrer">
                            {link}
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <p className="mt-3 text-xs text-ink-500 dark:text-ink-300">
                    {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : ''}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No submissions yet" description="Work deliveries and review history will appear here once the student submits progress." />
          )}
        </CardContent>
      </Card>

      {isStudent ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="text-2xl font-semibold">Deliver work</h2>
            <Textarea
              rows={4}
              placeholder="Describe the delivery and anything the client should review."
              value={submissionMessage}
              onChange={(e) => setSubmissionMessage(e.target.value)}
              disabled={submitMutation.isPending}
            />
            <Textarea
              rows={3}
              placeholder="Links (one per line)"
              value={submissionLinks}
              onChange={(e) => setSubmissionLinks(e.target.value)}
              disabled={submitMutation.isPending}
            />
            <Button
              type="button"
              disabled={submitMutation.isPending || !submissionMessage.trim()}
              onClick={() =>
                submitMutation.mutate({
                  message: submissionMessage.trim(),
                  links: submissionLinks
                    .split('\n')
                    .map((link) => link.trim())
                    .filter(Boolean),
                })
              }
            >
              {submitMutation.isPending ? 'Submitting...' : 'Submit work'}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {isClient ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="text-2xl font-semibold">Client actions</h2>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" disabled={acceptMutation.isPending || contract.status !== 'submitted'} onClick={() => acceptMutation.mutate()}>
                {acceptMutation.isPending ? 'Releasing...' : 'Accept work and release escrow'}
              </Button>
              <Button type="button" variant="ghost" disabled={requestChangesMutation.isPending || contract.status !== 'submitted'} onClick={() => requestChangesMutation.mutate()}>
                {requestChangesMutation.isPending ? 'Updating...' : 'Request changes'}
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-ink-700 dark:text-ink-200">Rating (1–5)</label>
                <Input
                  placeholder="e.g. 4"
                  type="number"
                  min={1}
                  max={5}
                  value={reviewRating}
                  onChange={(e) => setReviewRating(e.target.value)}
                  disabled={reviewMutation.isPending || contract.escrowStatus !== 'released' || hasReviewed}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-ink-700 dark:text-ink-200">Feedback</label>
              <Textarea
                rows={3}
                placeholder="Share your honest feedback about the student's work and professionalism."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                disabled={reviewMutation.isPending || contract.escrowStatus !== 'released' || hasReviewed}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={reviewMutation.isPending || contract.escrowStatus !== 'released' || hasReviewed || !reviewRating.trim()}
              onClick={() => {
                const ratingValue = Number(reviewRating);
                if (!Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5) {
                  toast.error('Rating must be between 1 and 5.');
                  return;
                }
                reviewMutation.mutate({
                  rating: ratingValue,
                  comment: reviewComment.trim() || undefined,
                });
              }}
            >
              {hasReviewed ? 'Review submitted' : reviewMutation.isPending ? 'Submitting...' : 'Submit review'}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default ContractDetails;
