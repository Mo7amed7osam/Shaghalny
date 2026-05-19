import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  createWithdrawalRequest,
  getWalletBalance,
  getWithdrawalRequests,
} from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';
import useAuth from '@/hooks/useAuth';

const StudentWallet: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?._id;

  const [amount, setAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'BANK' | 'INSTAPAY'>('BANK');
  const [bankAccount, setBankAccount] = useState('');
  const [instapayHandle, setInstapayHandle] = useState('');
  const [note, setNote] = useState('');

  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['wallet', 'balance', userId],
    queryFn: getWalletBalance,
    enabled: !!userId,
  });

  const { data: withdrawals, isLoading: withdrawalsLoading } = useQuery({
    queryKey: ['wallet', 'withdrawals', userId],
    queryFn: getWithdrawalRequests,
    enabled: !!userId,
  });

  const withdrawMutation = useMutation({
    mutationFn: createWithdrawalRequest,
    onSuccess: () => {
      toast.success('Withdrawal request submitted.');
      setAmount('');
      setBankAccount('');
      setInstapayHandle('');
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['wallet', 'withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to submit withdrawal request.');
    },
  });

  const handleSubmit = () => {
    const amountValue = Number(amount);
    const balance = Number(balanceData?.balance || 0);

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      toast.error('Enter a valid amount.');
      return;
    }
    if (amountValue > balance) {
      toast.error('Withdrawal amount exceeds balance.');
      return;
    }
    if (payoutMethod === 'BANK' && !bankAccount.trim()) {
      toast.error('Bank account is required.');
      return;
    }
    if (payoutMethod === 'INSTAPAY' && !instapayHandle.trim()) {
      toast.error('Instapay handle is required.');
      return;
    }

    withdrawMutation.mutate({
      amount: amountValue,
      bankAccount: payoutMethod === 'BANK' ? bankAccount.trim() : undefined,
      instapayHandle: payoutMethod === 'INSTAPAY' ? instapayHandle.trim() : undefined,
      note: note.trim() || undefined,
    });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Student wallet"
        title="Withdraw earnings"
        description="Request payouts through your preferred method and keep a clean view of every withdrawal request."
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <StatCard
          label="Available balance"
          value={balanceLoading ? <Skeleton className="h-10 w-24" /> : `$${Number(balanceData?.balance || 0).toFixed(2)}`}
          caption="Your balance updates after client acceptance."
          tone="brand"
          className="xl:col-span-1"
        />

        <div className="glass-panel xl:col-span-2 p-6">
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-semibold">Request a withdrawal</h2>
              <p className="text-sm text-ink-500 dark:text-ink-300">Provide the amount and payout destination, then submit the request for admin review.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={withdrawMutation.isPending} />
              <Select value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value as 'BANK' | 'INSTAPAY')} disabled={withdrawMutation.isPending}>
                <option value="BANK">Bank account</option>
                <option value="INSTAPAY">Instapay</option>
              </Select>
            </div>

            {payoutMethod === 'BANK' ? (
              <Input placeholder="Bank account" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} disabled={withdrawMutation.isPending} />
            ) : (
              <Input placeholder="Instapay handle" value={instapayHandle} onChange={(e) => setInstapayHandle(e.target.value)} disabled={withdrawMutation.isPending} />
            )}

            <Textarea rows={4} placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} disabled={withdrawMutation.isPending} />

            <Button onClick={handleSubmit} disabled={withdrawMutation.isPending}>
              {withdrawMutation.isPending ? 'Submitting...' : 'Submit withdrawal'}
            </Button>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Withdrawal history</h2>
          <p className="text-sm text-ink-500 dark:text-ink-300">Track status updates, decisions, and any decline reasons.</p>
        </div>

        {withdrawalsLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : (withdrawals || []).length === 0 ? (
          <EmptyState title="No withdrawal requests yet" description="Your withdrawal history will appear here after you submit the first payout request." />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Amount</TableHeaderCell>
                <TableHeaderCell>Method</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Submitted</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(withdrawals || []).map((w: any) => (
                <TableRow key={w._id}>
                  <TableCell className="font-semibold">${w.amount}</TableCell>
                  <TableCell>{w.payoutMethod}</TableCell>
                  <TableCell>
                    <Badge variant={w.status === 'APPROVED' ? 'success' : w.status === 'DECLINED' ? 'danger' : 'warning'}>
                      {w.status}
                    </Badge>
                    {w.status === 'DECLINED' && w.decisionReason ? (
                      <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">{w.decisionReason}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>{w.createdAt ? new Date(w.createdAt).toLocaleDateString() : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
};

export default StudentWallet;
