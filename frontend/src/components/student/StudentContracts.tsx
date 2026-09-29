import { formatCurrency } from '@/lib/currency';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, Wallet, FileText } from 'lucide-react';

import useAuth from '@/hooks/useAuth';
import { getContracts, getStudentProfile } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] } },
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

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

  const balance = profile?.balance?.toFixed?.(2) ?? '0.00';

  return (
    <motion.div className="min-w-0 space-y-5" initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeUp}>
        <PageHeader
          eyebrow="Student workspace"
          title="My contracts"
          description="Track each engagement, review status, and delivered budget."
        />
      </motion.div>

      {/* Balance card */}
      <motion.div variants={fadeUp}>
          <Card className="border-brand-200 bg-brand-50 dark:border-brand-700/40 dark:bg-brand-900/20">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-800/50 dark:text-brand-300">
              <Wallet size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-600 dark:text-brand-400">Available balance</p>
              <p className="mt-0.5 text-2xl font-bold tracking-tight text-brand-700 dark:text-brand-300">{formatCurrency(balance)}</p>
              <p className="text-xs text-brand-500 dark:text-brand-400">Released funds ready for withdrawal</p>
            </div>
            <Button variant="soft" size="sm" className="w-full sm:ml-auto sm:w-auto" onClick={() => navigate('/student/wallet')}>
              Withdraw <ArrowRight size={13} />
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Contracts list */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
        </div>
      ) : (contracts || []).length === 0 ? (
        <EmptyState title="No contracts yet" description="Accepted proposals turn into active contracts and appear here." />
      ) : (
        <motion.div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3" variants={stagger} initial="hidden" animate="visible">
          {(contracts || []).map((contract: any) => (
            <motion.div key={contract._id} variants={fadeUp} className="min-w-0">
              <Card className="group flex flex-col gap-0 overflow-hidden p-0 transition-all hover:-translate-y-0.5 hover:shadow-card">
                <div className="flex min-w-0 items-start justify-between gap-3 p-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500 dark:bg-white/10 dark:text-ink-400">
                      <FileText size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink-900 dark:text-white">{contract.jobId?.title || 'Contract'}</p>
                      <p className="text-xs text-ink-500 dark:text-ink-400">{contract.clientId?.name || 'Client'}</p>
                    </div>
                  </div>
                  <Badge variant={contract.status === 'completed' ? 'success' : 'brand'} className="shrink-0">{contract.status}</Badge>
                </div>
                <Separator />
                <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                   <span className="text-sm font-bold text-ink-900 dark:text-white">
                    {Number(contract.agreedBudget) === 0 ? 'Unpaid internship' : formatCurrency(contract.agreedBudget)}
                  </span>
                  <Button variant="ghost" size="sm" className="h-7 justify-start text-xs sm:justify-center" onClick={() => navigate(`/contracts/${contract._id}`)}>
                    View contract <ArrowRight size={11} />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};

export default StudentContracts;
