import { formatCurrency } from '@/lib/currency';
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  createTopUpRequest,
  downloadTopUpScreenshot,
  getTopUpRequests,
  getWalletBalance,
} from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
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

const ClientWallet: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?._id;

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);

  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['wallet', 'balance', userId],
    queryFn: getWalletBalance,
    enabled: !!userId,
  });

  const { data: topups, isLoading: topupsLoading } = useQuery({
    queryKey: ['wallet', 'topups', userId],
    queryFn: getTopUpRequests,
    enabled: !!userId,
  });

  const topupMutation = useMutation({
    mutationFn: (payload: { amount: number; screenshot: File; note?: string }) => createTopUpRequest(payload),
    onSuccess: () => {
      toast.success('Top-up request submitted.');
      setAmount('');
      setNote('');
      setScreenshot(null);
      queryClient.invalidateQueries({ queryKey: ['wallet', 'topups'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to submit top-up request.');
    },
  });

  const handleSubmit = () => {
    const amountValue = Number(amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      toast.error('Enter a valid amount.');
      return;
    }
    if (!screenshot) {
      toast.error('Screenshot is required.');
      return;
    }
    topupMutation.mutate({
      amount: amountValue,
      screenshot,
      note: note.trim() || undefined,
    });
  };

  const openScreenshot = async (id: string) => {
    try {
      const blob = await downloadTopUpScreenshot(id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load screenshot.');
    }
  };

  const instapayReceiver = balanceData?.instapayReceiver || '01146370900';

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Client wallet"
        title="Wallet and top-ups"
        description="Fund your balance, attach proof cleanly, and keep escrow-ready capital available for hiring."
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <StatCard
          label="Current balance"
          value={balanceLoading ? <Skeleton className="h-10 w-24" /> : formatCurrency(balanceData?.balance)}
          caption="Funds ready for escrow-backed hiring."
          tone="brand"
        />

        <div className="glass-panel xl:col-span-2 p-6">
          <h2 className="text-2xl font-semibold">Instapay instructions</h2>
          <p className="mt-2 text-sm text-ink-500 dark:text-ink-300">
            Transfer the exact amount to <span className="font-semibold text-ink-900 dark:text-white">{instapayReceiver}</span>, then upload the payment screenshot below.
          </p>
        </div>
      </div>

      <div className="glass-panel p-6">
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-semibold">Submit top-up request</h2>
            <p className="text-sm text-ink-500 dark:text-ink-300">Add the transfer amount, attach proof, and include any useful reference note.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input type="number" min={0} placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={topupMutation.isPending} />
            <Input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={(e) => setScreenshot(e.target.files?.[0] || null)} disabled={topupMutation.isPending} />
          </div>

          {screenshot ? <p className="text-sm text-ink-500 dark:text-ink-300">{screenshot.name}</p> : null}

          <Textarea rows={4} placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} disabled={topupMutation.isPending} />

          <Button type="button" disabled={topupMutation.isPending} onClick={handleSubmit}>
            {topupMutation.isPending ? 'Submitting…' : 'Submit top-up'}
          </Button>
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Top-up history</h2>
          <p className="text-sm text-ink-500 dark:text-ink-300">Review every funding request, approval status, and uploaded screenshot.</p>
        </div>

        {topupsLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : (topups || []).length === 0 ? (
          <EmptyState title="No top-up requests yet" description="Your funding history will appear here after the first top-up submission." />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Amount</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Submitted</TableHeaderCell>
                <TableHeaderCell>Action</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(topups || []).map((topup: any) => (
                <TableRow key={topup._id}>
                  <TableCell className="font-semibold">{formatCurrency(topup.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={topup.status === 'APPROVED' ? 'success' : topup.status === 'DECLINED' ? 'danger' : 'warning'}>
                      {topup.status}
                    </Badge>
                    {topup.status === 'DECLINED' && topup.decisionReason ? (
                      <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">{topup.decisionReason}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>{topup.createdAt ? new Date(topup.createdAt).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => openScreenshot(topup._id)}>
                      View screenshot
                    </Button>
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

export default ClientWallet;
