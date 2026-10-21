import { formatCurrency } from '@/lib/currency';
import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { getStudentProfile } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { buildAssetUrl } from '@/lib/assets';

function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2);
}

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

  const photoUrl = buildAssetUrl(profile.profilePhotoUrl);
  const coverUrl = buildAssetUrl(profile.coverPhotoUrl);
  const coverStyle = coverUrl
    ? {
        backgroundImage: `linear-gradient(135deg, rgba(37,99,235,0.18), rgba(15,23,42,0.26)), url("${coverUrl.replace(/"/g, '\\"')}")`,
      }
    : undefined;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5">
      <section className="min-w-0 overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-card backdrop-blur-xl dark:border-white/10 dark:bg-ink-dark-surface/90 sm:rounded-[1.75rem]">
        <div
          className="h-28 bg-[linear-gradient(135deg,#2563eb_0%,#1e40af_48%,#0f172a_100%)] bg-cover bg-center sm:h-32 lg:h-36"
          style={coverStyle}
        />
        <div className="relative grid min-w-0 gap-4 px-4 pb-4 pt-14 sm:gap-5 sm:px-6 sm:pb-5 sm:pt-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-7">
          <div className="absolute left-4 top-0 h-24 w-24 -translate-y-1/2 overflow-hidden rounded-full border-4 border-white bg-brand-50 shadow-elevated ring-1 ring-ink-200 dark:border-ink-dark-surface dark:bg-white/10 dark:ring-white/10 sm:left-6 sm:h-28 sm:w-28 lg:left-7">
            {photoUrl ? (
              <img src={photoUrl} alt={`${profile.name} profile`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-brand-600 dark:text-brand-300 sm:text-3xl">{getInitials(profile.name)}</div>
            )}
          </div>
          <div className="min-w-0 sm:pl-36">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 max-w-full break-words text-2xl font-semibold tracking-tight text-ink-950 dark:text-white sm:text-3xl">{profile.name}</h1>
              {(profile.verifiedSkills || []).length ? <Badge variant="brand">Verified</Badge> : null}
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600 dark:text-ink-300">
              {profile.description || 'Student profile overview and verified skill history.'}
            </p>
            {profile.university ? <p className="mt-2 break-words text-sm font-medium text-ink-500 dark:text-ink-dark-muted">{profile.university}</p> : null}
          </div>
          <div className="grid min-w-0 grid-cols-3 gap-2 self-end sm:gap-3">
            {[
              { label: 'Skills', value: (profile.verifiedSkills || []).length },
              { label: 'Projects', value: (profile.portfolioLinks || []).length },
              { label: 'Reviews', value: (profile.reviews || []).length },
            ].map((item) => (
              <div key={item.label} className="min-w-0 rounded-2xl border border-ink-200/80 bg-white/75 px-2 py-2.5 text-center shadow-soft dark:border-white/10 dark:bg-white/[0.05] sm:px-3 sm:py-3">
                <p className="text-lg font-semibold tracking-tight text-ink-950 dark:text-white sm:text-xl">{item.value}</p>
                <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-500 dark:text-ink-dark-muted sm:tracking-[0.14em]">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid min-w-0 gap-4 sm:gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="min-w-0">
          <CardContent className="space-y-4 p-4">
            <p className="text-sm text-ink-500 dark:text-ink-300">Jobs completed: {profile.jobsCompleted || 0}</p>

            <div className="muted-panel rounded-lg p-4">
              <p className="text-sm font-semibold text-ink-900 dark:text-white">Portfolio</p>
              {(profile.portfolioLinks || []).length ? (
                <ul className="mt-3 space-y-2 text-sm">
                  {(profile.portfolioLinks || []).map((link: string, index: number) => (
                    <li key={`${link}-${index}`} className="min-w-0">
                      <a href={link} target="_blank" rel="noreferrer" className="break-all">
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

        <Card className="min-w-0">
          <CardContent className="space-y-4 p-4">
            <div>
              <h2 className="text-xl font-semibold sm:text-2xl">Verified skills</h2>
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
                        {review.createdAt ? <span className="text-xs text-ink-500 dark:text-ink-300">{new Date(review.createdAt).toLocaleDateString()}</span> : null}
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
                <h2 className="text-xl font-semibold sm:text-2xl">Proposal history for this job</h2>
                {(profile.proposalHistory || []).length ? (
                  <div className="mt-4 space-y-4">
                    {(profile.proposalHistory || []).map((proposal: any) => (
                      <div key={proposal._id} className="muted-panel rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <Badge variant="subtle">{proposal.status}</Badge>
                          {proposal.createdAt ? <span className="text-xs text-ink-500 dark:text-ink-300">{new Date(proposal.createdAt).toLocaleDateString()}</span> : null}
                        </div>
                        {proposal.proposedBudget ? <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">Proposed budget: {formatCurrency(proposal.proposedBudget)}</p> : null}
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
