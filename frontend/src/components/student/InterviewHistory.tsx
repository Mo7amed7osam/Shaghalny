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
      )}
    </div>
  );
};

export default InterviewHistory;