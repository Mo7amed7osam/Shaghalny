import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { getStudentProfile } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';

const StudentPublicProfile: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('jobId') || undefined;

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['student', 'public-profile', id, jobId],
    queryFn: () => getStudentProfile(id as string, { jobId }),
    enabled: !!id,
  });

  if (isLoading) return <Skeleton className="h-80 w-full rounded-xl" />;
  if (isError || !profile) return <EmptyState title="Unable to load student profile" description="This profile could not be loaded right now." />;

  const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
  const origin = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
  const buildAssetUrl = (value?: string) => (value ? (value.startsWith('http') ? value : `${origin}${value}`) : '');
  const photoUrl = buildAssetUrl(profile.profilePhotoUrl);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Student profile"
        title={profile.name}
        description={profile.description || 'Student profile overview and verified skill history.'}
      />

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-4">
              <div className="h-24 w-24 overflow-hidden rounded-xl border border-ink-200 bg-ink-50 dark:border-white/10 dark:bg-white/5">
                {photoUrl ? (
                  <img src={photoUrl} alt={`${profile.name} profile`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-ink-500 dark:text-ink-300">No photo</div>
                )}
              </div>
              <div>
                {profile.university ? <p className="text-sm text-ink-500 dark:text-ink-300">{profile.university}</p> : null}
                <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">Jobs completed: {profile.jobsCompleted || 0}</p>
              </div>
            </div>

            <div className="muted-panel rounded-lg p-4">
              <p className="text-sm font-semibold text-ink-900 dark:text-white">Portfolio</p>
              {(profile.portfolioLinks || []).length ? (
                <ul className="mt-3 space-y-2 text-sm">
                  {(profile.portfolioLinks || []).map((link: string, index: number) => (
                    <li key={`${link}-${index}`}>
                      <a href={link} target="_blank" rel="noreferrer">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-ink-500 dark:text-ink-300">No portfolio links yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5 p-6">
            <div>
              <h2 className="text-2xl font-semibold">Verified skills</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {(profile.verifiedSkills || []).length ? (
                  (profile.verifiedSkills || []).map((skill: any) => (
                    <Badge key={skill.skill?._id || skill.skill?.name || skill._id} variant="brand">
                      {skill.skill?.name || skill.skill} ({skill.score})
                    </Badge>
                  ))
                ) : (
                  <Badge variant="subtle">No verified skills yet</Badge>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold">Client reviews</h2>
              {(profile.reviews || []).length ? (
                <div className="mt-4 space-y-4">
                  {(profile.reviews || []).map((review: any, index: number) => (
                    <div key={`${review.clientName}-${index}`} className="muted-panel rounded-lg p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-ink-900 dark:text-white">{review.clientName}</p>
                          <p className="text-xs text-ink-500 dark:text-ink-300">
                            {review.jobTitle ? `${review.jobTitle} • ` : ''}Rating {review.rating}/5
                          </p>
                        </div>
                        {review.createdAt ? <span className="text-xs text-ink-400 dark:text-ink-300">{new Date(review.createdAt).toLocaleDateString()}</span> : null}
                      </div>
                      {review.comment ? <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">{review.comment}</p> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink-500 dark:text-ink-300">No reviews yet.</p>
              )}
            </div>

            {profile.proposalHistory ? (
              <div>
                <h2 className="text-2xl font-semibold">Proposal history for this job</h2>
                {(profile.proposalHistory || []).length ? (
                  <div className="mt-4 space-y-4">
                    {(profile.proposalHistory || []).map((proposal: any) => (
                      <div key={proposal._id} className="muted-panel rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <Badge variant="subtle">{proposal.status}</Badge>
                          {proposal.createdAt ? <span className="text-xs text-ink-400 dark:text-ink-300">{new Date(proposal.createdAt).toLocaleDateString()}</span> : null}
                        </div>
                        {proposal.proposedBudget ? <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">Proposed budget: ${proposal.proposedBudget}</p> : null}
                        {proposal.details ? <p className="mt-3 whitespace-pre-line text-sm text-ink-500 dark:text-ink-300">{proposal.details}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-ink-500 dark:text-ink-300">No proposals for this job yet.</p>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentPublicProfile;
