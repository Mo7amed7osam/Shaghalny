import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { getClientJobs, getClientProposals } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Client dashboard"
        title={
          <>
            Manage your <span className="text-brand-600 dark:text-brand-300">hiring pipeline</span>
          </>
        }
        description="Track openings, incoming proposals, and live contracts from one cleaner client workspace."
        actions={
          <Button onClick={() => navigate('/client/post-job')}>
            Post a job
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        <StatCard label="Open jobs" value={jobsLoading ? <Skeleton className="h-10 w-24" /> : openJobs.length} caption="Listings currently visible to students." />
        <StatCard label="Active contracts" value={jobsLoading ? <Skeleton className="h-10 w-24" /> : activeJobs.length} caption="Projects that are currently in progress." />
        <StatCard label="Completed jobs" value={jobsLoading ? <Skeleton className="h-10 w-24" /> : completedJobs.length} caption="Successfully delivered engagements." tone="brand" />
        <StatCard label="Total proposals" value={proposalsLoading ? <Skeleton className="h-10 w-24" /> : (proposals || []).length} caption="Applications received from student talent." />
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center justify-between gap-4">
  <div>
    <h2 className="text-2xl font-semibold">Recent proposals</h2>
    <p className="text-sm text-ink-500 dark:text-ink-300">Review the latest applicants and move the strongest ones forward.</p>
  </div>
  <Button variant="outline" size="sm" onClick={() => navigate('/client/view-proposals')}>
    View all
  </Button>
</div>
          </div>
        </div>

        {jobsLoading ? (
          <Skeleton className="h-44 w-full rounded-3xl" />
        ) : (jobs || []).length === 0 ? (
          <EmptyState
            title="No jobs posted yet"
            description="Create your first listing to start receiving student proposals."
            actionLabel="Post a job"
            onAction={() => navigate('/client/post-job')}
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Role</TableHeaderCell>
                <TableHeaderCell>Skills</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(jobs || []).map((job: any) => (
                <TableRow key={job._id}>
                  <TableCell className="font-semibold">{job.title}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {(job.requiredSkills || []).map((skill: any) => (
                        <Badge key={skill._id || skill} variant="subtle">
                          {skill.name || skill}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={job.status === 'completed' ? 'success' : job.status === 'in_progress' ? 'brand' : 'warning'}>
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/client/view-proposals?jobId=${job._id}`)}>
                      View proposals
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Recent proposals</h2>
          <p className="text-sm text-ink-500 dark:text-ink-300">Review the latest applicants and move the strongest ones forward.</p>
        </div>

        {proposalsLoading ? (
          <Skeleton className="h-44 w-full rounded-3xl" />
        ) : (proposals || []).length === 0 ? (
          <EmptyState title="No proposals yet" description="Once students apply, their proposals will appear here with status and skill context." />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Student</TableHeaderCell>
                <TableHeaderCell>Job</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(proposals || []).slice(0, 5).map((proposal: any) => (
                <TableRow key={proposal._id}>
                  <TableCell className="font-semibold">{proposal.studentId?.name || 'Student'}</TableCell>
                  <TableCell>{proposal.jobId?.title || 'Job'}</TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
};

export default ClientDashboard;
