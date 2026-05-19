import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import useAuth from '@/hooks/useAuth';
import { getContracts, getStudentProfile } from '@/services/api';
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

const StudentContracts: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?._id || user?.id;

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts', 'student'],
    queryFn: () => getContracts(),
  });

  const { data: profile } = useQuery({
    queryKey: ['student', 'profile', userId],
    queryFn: () => getStudentProfile(userId),
    enabled: !!userId,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Student workspace"
        title="My contracts"
        description="Track each engagement, review status, and delivered budget from one cleaner contract workspace."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Available balance" value={`$${profile?.balance?.toFixed?.(2) || '0.00'}`} caption="Released funds ready for withdrawal." tone="brand" />
      </div>

      {isLoading ? (
        <Skeleton className="h-44 w-full rounded-xl" />
      ) : (contracts || []).length === 0 ? (
        <EmptyState title="No contracts yet" description="Accepted proposals will turn into active contracts and appear here." />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Job</TableHeaderCell>
              <TableHeaderCell>Client</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Budget</TableHeaderCell>
              <TableHeaderCell className="text-right">Action</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(contracts || []).map((contract: any) => (
              <TableRow key={contract._id}>
                <TableCell className="font-semibold">{contract.jobId?.title || 'Job'}</TableCell>
                <TableCell>{contract.clientId?.name || 'Client'}</TableCell>
                <TableCell>
                  <Badge variant={contract.status === 'completed' ? 'success' : 'brand'}>{contract.status}</Badge>
                </TableCell>
                <TableCell>${contract.agreedBudget}</TableCell>
                <TableCell className="text-right">
                  <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/contracts/${contract._id}`)}>
                    View contract
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default StudentContracts;
