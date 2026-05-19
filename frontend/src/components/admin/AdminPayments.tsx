import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  approveAdminTopUp,
  approveAdminWithdrawal,
  declineAdminTopUp,
  declineAdminWithdrawal,
  downloadTopUpScreenshot,
  getAdminTopUps,
  getAdminWithdrawals,
} from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';

const AdminPayments: React.FC = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'topups' | 'withdrawals'>('topups');
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [declineReasons, setDeclineReasons] = useState<Record<string, string>>({});

  const { data: topups, isLoading: topupsLoading } = useQuery({
    queryKey: ['admin', 'payments', 'topups', statusFilter],
    queryFn: () => getAdminTopUps(statusFilter),
    enabled: activeTab === 'topups',
  });

  const { data: withdrawals, isLoading: withdrawalsLoading } = useQuery({
    queryKey: ['admin', 'payments', 'withdrawals', statusFilter],
    queryFn: () => getAdminWithdrawals(statusFilter),
    enabled: activeTab === 'withdrawals',
  });

  const approveTopupMutation = useMutation({
    mutationFn: (id: string) => approveAdminTopUp(id),
    onSuccess: () => {
      toast.success('Top-up approved.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments', 'topups'] });
    },
  });

  const declineTopupMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => declineAdminTopUp(id, { reason }),
    onSuccess: () => {
      toast.success('Top-up declined.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments', 'topups'] });
    },
  });

  const approveWithdrawalMutation = useMutation({
    mutationFn: (id: string) => approveAdminWithdrawal(id),
    onSuccess: () => {
      toast.success('Withdrawal approved.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments', 'withdrawals'] });
    },
  });

  const declineWithdrawalMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => declineAdminWithdrawal(id, { reason }),
    onSuccess: () => {
      toast.success('Withdrawal declined.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments', 'withdrawals'] });
    },
  });

  const openScreenshot = async (id: string) => {
    try {
      const blob = await downloadTopUpScreenshot(id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error('Failed to load screenshot.');
    }
  };

  const loading = activeTab === 'topups' ? topupsLoading : withdrawalsLoading;
  const items = activeTab === 'topups' ? topups || [] : withdrawals || [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin payments"
        title="Payments management"
        description="Review top-up evidence and withdrawal requests with clearer status handling and action grouping."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button variant={activeTab === 'topups' ? 'default' : 'outline'} onClick={() => setActiveTab('topups')}>
          Top-ups
        </Button>
        <Button variant={activeTab === 'withdrawals' ? 'default' : 'outline'} onClick={() => setActiveTab('withdrawals')}>
          Withdrawals
        </Button>
        <div className="ml-auto w-full sm:w-52">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="DECLINED">Declined</option>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {loading ? (
            <Skeleton className="h-44 w-full rounded-xl" />
          ) : items.length === 0 ? (
            <EmptyState title="No requests found" description="There are no payment requests for the current tab and status filter." />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{activeTab === 'topups' ? 'Client' : 'Student'}</TableHeaderCell>
                  <TableHeaderCell>Amount</TableHeaderCell>
                  {activeTab === 'withdrawals' ? <TableHeaderCell>Method</TableHeaderCell> : null}
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item: any) => (
                  <TableRow key={item._id}>
                    <TableCell>
                      <div className="font-semibold text-ink-900 dark:text-white">{(item.clientId || item.studentId)?.name}</div>
                      <p className="text-xs text-ink-500 dark:text-ink-300">{(item.clientId || item.studentId)?.email}</p>
                    </TableCell>
                    <TableCell className="font-semibold">${item.amount}</TableCell>
                    {activeTab === 'withdrawals' ? <TableCell>{item.payoutMethod}</TableCell> : null}
                    <TableCell>
                      <Badge variant={item.status === 'APPROVED' ? 'success' : item.status === 'DECLINED' ? 'danger' : 'warning'}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-3">
                        {activeTab === 'topups' ? (
                          <Button size="sm" variant="outline" onClick={() => openScreenshot(item._id)}>
                            View screenshot
                          </Button>
                        ) : null}

                        {item.status === 'PENDING' ? (
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  activeTab === 'topups' ? approveTopupMutation.mutate(item._id) : approveWithdrawalMutation.mutate(item._id)
                                }
                              >
                                Approve
                              </Button>
                            </div>

                            <Textarea
                              rows={2}
                              placeholder="Decline reason"
                              value={declineReasons[item._id] || ''}
                              onChange={(e) => setDeclineReasons((prev) => ({ ...prev, [item._id]: e.target.value }))}
                            />

                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-400/10"
                              onClick={() =>
                                activeTab === 'topups'
                                  ? declineTopupMutation.mutate({ id: item._id, reason: declineReasons[item._id] })
                                  : declineWithdrawalMutation.mutate({ id: item._id, reason: declineReasons[item._id] })
                              }
                            >
                              Decline
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPayments;
