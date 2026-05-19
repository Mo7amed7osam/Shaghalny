import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { getContracts } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';

const ClientContracts: React.FC = () => {
  const navigate = useNavigate();

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts', 'client'],
    queryFn: () => getContracts(),
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Client workspace"
        title="Active contracts"
        description="Monitor live engagements and move into contract details without losing track of status or budget."
      />

      {isLoading ? (
        <Skeleton className="h-44 w-full rounded-xl" />
      ) : (contracts || []).length === 0 ? (
        <EmptyState title="No contracts yet" description="Accepted student proposals will appear here as contracts once the hiring flow moves forward." />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Job</TableHeaderCell>
              <TableHeaderCell>Student</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Budget</TableHeaderCell>
              <TableHeaderCell>Action</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(contracts || []).map((contract: any) => (
              <TableRow key={contract._id}>
                <TableCell className="font-semibold">{contract.jobId?.title || 'Job'}</TableCell>
                <TableCell>{contract.studentId?.name || 'Student'}</TableCell>
                <TableCell>
                  <Badge variant={contract.status === 'completed' ? 'success' : 'brand'}>{contract.status}</Badge>
                </TableCell>
                <TableCell>${contract.agreedBudget}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/contracts/${contract._id}`)}>
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

export default ClientContracts;
