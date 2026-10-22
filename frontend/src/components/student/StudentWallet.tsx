import { formatCurrency } from '@/lib/currency';
import React, { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Check, CreditCard, Wallet } from 'lucide-react';

import {
  createWithdrawalRequest,
  getWalletBalance,
  getWithdrawalRequests,
} from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import useAuth from '@/hooks/useAuth';

const statusVariant = (status: string) => {
  if (status === 'APPROVED') return 'success';
  if (status === 'DECLINED') return 'danger';
  return 'warning';
};

const StudentWallet: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?._id;

  const [amount, setAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'BANK' | 'INSTAPAY'>('BANK');
  const [bankAccount, setBankAccount] = useState('');
  const [instapayHandle, setInstapayHandle] = useState('');
  const [note, setNote] = useState('');
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const payoutMethodRef = useRef<HTMLSelectElement | null>(null);

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
      setIsWithdrawOpen(false);
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

  const stats = useMemo(() => {
    const list = withdrawals || [];
    const pending = list
      .filter((item: any) => item.status === 'PENDING')
      .reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
    const lifetimeWithdrawn = list
      .filter((item: any) => item.status === 'APPROVED')
      .reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
    return { pending, lifetimeWithdrawn };
  }, [withdrawals]);

  const balance = balanceData?.balance ?? 0;
  const paymentsUnavailable = !balanceLoading && balanceData?.demoMode !== true && balanceData?.paymentsEnabled !== true;

  const handleChangePayoutMethod = () => {
    setIsWithdrawOpen(true);
    window.setTimeout(() => payoutMethodRef.current?.focus(), 120);
  };

  return (
    <div className="space-y-[22px]">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="sh-page-title">Wallet</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-dark-muted">Earnings, pending payments, and withdrawals.</p>
          {paymentsUnavailable ? (
            <p role="status" className="mt-2 max-w-2xl rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
              Payments are not available yet: no payment provider is configured, so paid contracts, escrow and withdrawals are switched off. Unpaid internships still work.
            </p>
          ) : null}
        </div>
        <Button onClick={() => setIsWithdrawOpen(true)} disabled={withdrawMutation.isPending || paymentsUnavailable}>
          Withdraw funds
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr]">
        <section className="sh-wallet-card">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[#b7b7d6]">Available balance</span>
            <Wallet size={17} className="text-[#8b8bd6]" />
          </div>
          <div className="sh-number mt-2 text-[30px] text-white">
            {balanceLoading ? <Skeleton className="h-9 w-28 bg-white/20" /> : formatCurrency(balance)}
          </div>
          <div className="mt-1 text-[12.5px] text-[#9a9ac9]">Ready to withdraw · {payoutMethod === 'INSTAPAY' ? 'Instapay' : 'Bank account'}</div>
        </section>

        <section className="sh-panel p-5">
          <div className="text-[13px] text-ink-500 dark:text-ink-dark-muted">Pending withdrawals</div>
          <div className="sh-number mt-2 text-2xl text-ink-900 dark:text-white">{formatCurrency(stats.pending)}</div>
          <span className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
            Awaiting admin review
          </span>
        </section>

        <section className="sh-panel p-5">
          <div className="text-[13px] text-ink-500 dark:text-ink-dark-muted">Lifetime withdrawn</div>
          <div className="sh-number mt-2 text-2xl text-ink-900 dark:text-white">{formatCurrency(stats.lifetimeWithdrawn)}</div>
          <span className="mt-2 inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300">
            Cleared payouts
          </span>
        </section>
      </div>

      <div className="grid items-start gap-[22px] lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="sh-panel p-5">
          <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-ink-900 dark:text-white">Transactions</h2>
            <div className="flex gap-1.5">
              <span className="sh-chip">All</span>
              <span className="sh-muted-chip">Withdrawals</span>
              <span className="sh-muted-chip">Pending</span>
            </div>
          </div>

          {withdrawalsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-xl" />)}
            </div>
          ) : (withdrawals || []).length === 0 ? (
            <EmptyState title="No withdrawal requests yet" description="Your withdrawal history will appear here after you submit the first payout request." />
          ) : (
            <div className="divide-y divide-ink-100 dark:divide-ink-dark-border">
              {(withdrawals || []).map((w: any) => (
                <div key={w._id} className="grid gap-3 py-3 sm:grid-cols-[38px_minmax(0,1fr)_auto_auto] sm:items-center">
                  <div className={`flex h-[38px] w-[38px] items-center justify-center rounded-[10px] ${w.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-ink-100 text-ink-500 dark:bg-white/[0.055]'}`}>
                    {w.status === 'APPROVED' ? <ArrowDown size={17} /> : <ArrowUp size={17} />}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-semibold text-ink-900 dark:text-white">Withdrawal request</div>
                    <div className="mt-0.5 text-xs text-ink-500 dark:text-ink-dark-muted">
                      {w.payoutMethod} · {w.createdAt ? new Date(w.createdAt).toLocaleDateString() : '-'}
                    </div>
                    {w.status === 'DECLINED' && w.decisionReason ? (
                      <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">{w.decisionReason}</p>
                    ) : null}
                  </div>
                  <Badge variant={statusVariant(w.status) as any}>{w.status}</Badge>
                  <div className="sh-number text-right text-sm text-ink-900 dark:text-white">{formatCurrency(w.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-[88px]">
          <section className="sh-panel p-[18px]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-900 dark:text-white">Payout method</h3>
              <button
                type="button"
                className="text-xs font-semibold text-brand-600 transition hover:text-brand-700 dark:text-brand-300 dark:hover:text-brand-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                onClick={handleChangePayoutMethod}
                disabled={withdrawMutation.isPending}
              >
                Change
              </button>
            </div>
            <div className="flex items-center gap-3 rounded-[11px] border border-ink-200 p-3 dark:border-ink-dark-border">
              <div className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-brand-50 text-brand-500 dark:bg-brand-500/15">
                <CreditCard size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-ink-900 dark:text-white">{payoutMethod === 'INSTAPAY' ? 'Instapay' : 'Bank account'}</div>
                <div className="text-[11.5px] text-ink-500 dark:text-ink-dark-muted">Default destination</div>
              </div>
              <Check size={15} className="text-emerald-600" />
            </div>
            <p className="mt-2.5 text-xs leading-5 text-ink-500">Withdrawals arrive after admin review.</p>
          </section>

          <section className="sh-panel p-[18px]">
            <h3 className="mb-3 text-sm font-semibold text-ink-900 dark:text-white">This month</h3>
            <div className="space-y-2.5 text-[13px]">
              <div className="flex justify-between"><span className="text-ink-500">Available</span><span className="sh-number">{formatCurrency(balance)}</span></div>
              <div className="flex justify-between"><span className="text-ink-500">Pending</span><span className="sh-number text-amber-700 dark:text-amber-300">{formatCurrency(stats.pending)}</span></div>
              <div className="flex justify-between"><span className="text-ink-500">Withdrawn</span><span className="sh-number">{formatCurrency(stats.lifetimeWithdrawn)}</span></div>
              <div className="h-px bg-ink-100 dark:bg-ink-dark-border" />
              <div className="flex justify-between font-semibold"><span>Net</span><span className="sh-number">{formatCurrency(Math.max(Number(balance) - stats.pending, 0))}</span></div>
            </div>
          </section>
        </aside>
      </div>

      <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
        <DialogContent className="max-w-md p-5">
          <DialogHeader>
            <DialogTitle>Withdraw funds</DialogTitle>
            <DialogDescription>
              Add the amount and payout destination. Requests are reviewed by admin before payout.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
          >
            <label className="block space-y-1.5 text-sm font-medium text-ink-700 dark:text-ink-200">
              <span>Amount (EGP)</span>
              <Input
              type="number"
              min={0}
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={withdrawMutation.isPending}
            />
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-ink-700 dark:text-ink-200">
              <span>Payout method</span>
              <Select
              ref={payoutMethodRef}
              value={payoutMethod}
              onChange={(e) => setPayoutMethod(e.target.value as 'BANK' | 'INSTAPAY')}
              disabled={withdrawMutation.isPending}
            >
              <option value="BANK">Bank account</option>
              <option value="INSTAPAY">Instapay</option>
            </Select>
            </label>

            {payoutMethod === 'BANK' ? (
              <label className="block space-y-1.5 text-sm font-medium text-ink-700 dark:text-ink-200">
              <span>Bank account</span>
              <Input
                placeholder="Bank account"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                disabled={withdrawMutation.isPending}
              />
            </label>
            ) : (
              <label className="block space-y-1.5 text-sm font-medium text-ink-700 dark:text-ink-200">
              <span>Instapay handle</span>
              <Input
                placeholder="Instapay handle"
                value={instapayHandle}
                onChange={(e) => setInstapayHandle(e.target.value)}
                disabled={withdrawMutation.isPending}
              />
            </label>
            )}

            <label className="block space-y-1.5 text-sm font-medium text-ink-700 dark:text-ink-200">
              <span>Optional note</span>
              <Textarea
              rows={4}
              placeholder="Optional note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={withdrawMutation.isPending}
            />
            </label>

            <DialogFooter className="pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsWithdrawOpen(false)}
                disabled={withdrawMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={withdrawMutation.isPending}>
                {withdrawMutation.isPending ? 'Submitting...' : 'Submit withdrawal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentWallet;
