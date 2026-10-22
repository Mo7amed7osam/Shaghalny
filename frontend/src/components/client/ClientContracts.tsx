import { formatCurrency } from '@/lib/currency';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, FileText } from 'lucide-react';

import { getContracts } from '@/services/api';
import { UserAvatar } from '@/components/ui/user-avatar';
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


const ClientContracts: React.FC = () => {
  const navigate = useNavigate();

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts', 'client'],
    queryFn: () => getContracts(),
  });

  return (
    <motion.div
      className="min-w-0 space-y-5"
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
    >
      <motion.div variants={fadeUp}>
        <PageHeader
          eyebrow="Client workspace"
          title="Active contracts"
          description="Monitor engagements and track delivery status."
        />
      </motion.div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
        </div>
      ) : (contracts || []).length === 0 ? (
        <EmptyState title="No contracts yet" description="Accepted proposals appear here as contracts." />
      ) : (
        <motion.div
          className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
          initial="hidden"
          animate="visible"
        >
          {(contracts || []).map((contract: any) => (
            <motion.div key={contract._id} variants={fadeUp} className="min-w-0">
              <Card className="group flex flex-col gap-0 overflow-hidden p-0 transition-all hover:-translate-y-0.5 hover:shadow-card">
                <CardContent className="flex min-w-0 items-start justify-between gap-3 p-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500 dark:bg-white/10 dark:text-ink-400">
                      <FileText size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink-900 dark:text-white">{contract.jobId?.title || 'Contract'}</p>
                      <div className="mt-1 flex min-w-0 items-center gap-1.5">
                        <UserAvatar user={contract.studentId} className="h-4 w-4" fallbackClassName="text-[8px]" />
                        <span className="truncate text-xs text-ink-500 dark:text-ink-400">{contract.studentId?.name || 'Student'}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={contract.status === 'completed' ? 'success' : 'brand'} className="shrink-0">{contract.status}</Badge>
                </CardContent>
                <Separator />
                <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-bold text-ink-900 dark:text-white">{formatCurrency(contract.agreedBudget)}</span>
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

export default ClientContracts;
