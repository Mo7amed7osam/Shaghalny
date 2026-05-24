import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getMyInterviewSessions } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';

const InterviewHistory: React.FC = () => {
  const navigate = useNavigate();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['my-interview-sessions'],
    queryFn: getMyInterviewSessions,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Student workspace"
        title="Interview History"
        description="View all your past AI interviews and their results."
      />

      {isLoading ? (
        <Skeleton className="h-44 w-full rounded-3xl" />
      ) : (sessions || []).length === 0 ? (
        <EmptyState
          title="No interviews yet"
          description="Complete a skill verification interview to see your history here."
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {(sessions || []).map((session: any) => (
              <div key={session._id} className="rounded-2xl border border-ink-200 bg-white p-4 shadow-soft dark:border-ink-dark-border dark:bg-ink-dark-surface">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-ink-900 dark:text-white">
                      {session.skillRef?.name || session.skill}
                    </p>
                    <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">
                      {session.createdAt ? new Date(session.createdAt).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  <Badge variant={session.status === 'completed' ? 'success' : 'warning'}>
                    {session.status}
                  </Badge>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm text-ink-500 dark:text-ink-300">Score:</span>
                  <span className="text-sm font-semibold text-ink-900 dark:text-white">
                    {session.finalScore ?? '—'}
                  </span>
                </div>

                <div className="mt-3">
                  <Badge variant={
                    session.finalRecommendation === 'pass' ? 'success' :
                    session.finalRecommendation === 'fail' ? 'danger' : 'warning'
                  }>
                    {session.finalRecommendation || 'pending'}
                  </Badge>
                </div>

                {session.status === 'completed' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4 w-full"
                    onClick={() => navigate(`/student/ai-interview/${session._id}/result`)}
                  >
                    View Result
                  </Button>
                ) : null}
              </div>
            ))}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Skill</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Score</TableHeaderCell>
                  <TableHeaderCell>Result</TableHeaderCell>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>Action</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(sessions || []).map((session: any) => (
                  <TableRow key={session._id}>
                    <TableCell className="font-semibold">
                      {session.skillRef?.name || session.skill}
                    </TableCell>
                    <TableCell>
                      <Badge variant={session.status === 'completed' ? 'success' : 'warning'}>
                        {session.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {session.finalScore ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        session.finalRecommendation === 'pass' ? 'success' :
                        session.finalRecommendation === 'fail' ? 'danger' : 'warning'
                      }>
                        {session.finalRecommendation || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {session.createdAt ? new Date(session.createdAt).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell>
                      {session.status === 'completed' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/student/ai-interview/${session._id}/result`)}
                        >
                          View Result
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
};

export default InterviewHistory;
