import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { getStudentProfile, getStudentProposals } from '@/services/api';
import useAuth from '@/hooks/useAuth';
import JobList from './JobList';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
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
  const activeProposals = proposalList.filter((proposal: any) => ['submitted', 'shortlisted'].includes(proposal.status)).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Student dashboard"
        title={
          <>
            Welcome back, <span className="text-brand-600 dark:text-brand-300">{user?.name}</span>
          </>
        }
        description="Track profile credibility, active proposals, earnings, and new jobs from one clear student workspace."
      />

      <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        <StatCard
          label="Verified skills"
          value={profileLoading ? <Skeleton className="h-10 w-24" /> : profile?.verifiedSkills?.length || 0}
          caption="Add more interview passes to strengthen your profile."
        />
        <StatCard
          label="Active proposals"
          value={proposalsLoading ? <Skeleton className="h-10 w-24" /> : activeProposals}
          caption="Keep your best applications moving with clear follow-up."
        />
        <StatCard
          label="Available balance"
          value={profileLoading ? <Skeleton className="h-10 w-24" /> : `$${profile?.balance?.toFixed?.(2) || '0.00'}`}
          caption="Released earnings available for withdrawal."
          tone="brand"
        />
        <StatCard
          label="Profile status"
          value={<Badge variant="success">Active</Badge>}
          caption="Your public profile is visible to hiring clients."
        />
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Job board</h2>
            <p className="text-sm text-ink-500 dark:text-ink-300">Browse roles and send proposals without leaving the dashboard.</p>
          </div>
        </div>
        <JobList embedded />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Recent applications</h2>
          <p className="text-sm text-ink-500 dark:text-ink-300">See where your applications stand and which clients have responded.</p>
        </div>

        {proposalsLoading ? (
          <Skeleton className="h-44 w-full rounded-xl" />
        ) : proposalList.length === 0 ? (
          <EmptyState
            title="No proposals yet"
            description="Start from the job board above and apply to roles that match your skills."
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Job</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Submitted</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {proposalList.map((proposal: any) => (
                <TableRow key={proposal._id}>
                  <TableCell className="font-semibold">{proposal.jobId?.title || 'Job'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        proposal.status === 'accepted'
                          ? 'success'
                          : proposal.status === 'rejected'
                            ? 'danger'
                            : proposal.status === 'shortlisted'
                              ? 'brand'
                              : 'warning'
                      }
                    >
                      {proposal.status || 'submitted'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-ink-500 dark:text-ink-300">
                    {proposal.createdAt ? new Date(proposal.createdAt).toLocaleDateString() : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
};

export default StudentDashboard;
