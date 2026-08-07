import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Landmark, ArrowDownToLine } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TablePagination, EmptyState, PageHeader } from '@/components/ui/Table';
import { useToast } from '@/lib/toast';
import { useQuery } from '@/lib/useQuery';
import { fetchAllDeposits, approveDeposit, rejectDeposit, fetchWithdrawals, processWithdrawal } from '@/lib/admin';
import { formatCurrency } from '@/lib/utils';

const PER_PAGE = 15;

const statusConfig: Record<string, { tone: 'success' | 'warning' | 'danger' | 'neutral'; label: string }> = {
  PENDING: { tone: 'warning', label: 'Chờ' }, COMPLETED: { tone: 'success', label: 'Hoàn thành' }, REJECTED: { tone: 'danger', label: 'Từ chối' },
};

export function AdminDepositsPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: deposits, loading, refetch } = useQuery(() => fetchAllDeposits(200, 0), []);
  const { data: withdrawals, refetch: refetchW } = useQuery(() => fetchWithdrawals(200, 0), []);

  const paginated = (deposits ?? []).slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleApprove = async (id: string) => { setActionLoading(id); try { await approveDeposit(id); toast('Đã duyệt nạp tiền', 'success'); refetch(); } catch (e: any) { toast(e.message ?? 'Lỗi', 'error'); } finally { setActionLoading(null); } };
  const handleReject = async (id: string) => { setActionLoading(id); try { await rejectDeposit(id); toast('Đã từ chối', 'success'); refetch(); } catch (e: any) { toast(e.message ?? 'Lỗi', 'error'); } finally { setActionLoading(null); } };
  const handleWithdrawal = async (id: string, action: 'APPROVE' | 'REJECT') => { setActionLoading(id); try { await processWithdrawal(id, action); toast(action === 'APPROVE' ? 'Đã duyệt rút tiền' : 'Đã từ chối', 'success'); refetchW(); } catch (e: any) { toast(e.message ?? 'Lỗi', 'error'); } finally { setActionLoading(null); } };

  const pendingDeposits = (deposits ?? []).filter((d) => d.status === 'PENDING').length;
  const pendingWithdrawals = (withdrawals ?? []).filter((w) => w.status === 'PENDING').length;

  return (
    <div className="space-y-5">
      <PageHeader title="Nạp & Rút tiền" subtitle={`${pendingDeposits} nạp chờ duyệt, ${pendingWithdrawals} rút chờ duyệt`} />

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-2"><Landmark className="h-5 w-5 text-success" /><h3 className="text-base font-semibold text-white">Lịch sử nạp tiền</h3></div>
          {loading ? (
            <div className="p-6 space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
          ) : paginated.length === 0 ? (
            <EmptyState icon={Landmark} title="Chưa có giao dịch nạp" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-text-dim border-b border-border bg-bg-soft/30"><th className="font-medium py-3 px-4">User</th><th className="font-medium py-3 px-4">Bank</th><th className="font-medium py-3 px-4 text-right">Số tiền</th><th className="font-medium py-3 px-4">Trạng thái</th><th className="font-medium py-3 px-4 text-right">Hành động</th></tr></thead>
                  <tbody>
                    {paginated.map((d, i) => (
                      <motion.tr key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }} className="border-b border-border/40 hover:bg-white/[0.02]">
                        <td className="py-3 px-4"><div className="text-white font-medium">{d.username}</div><div className="text-xs text-text-dim font-mono">{d.txn_code}</div></td>
                        <td className="py-3 px-4 text-text-muted">{d.bank}</td>
                        <td className="py-3 px-4 text-right font-medium text-white">{formatCurrency(Number(d.amount))}</td>
                        <td className="py-3 px-4"><Badge tone={statusConfig[d.status]?.tone ?? 'neutral'} size="sm" dot>{statusConfig[d.status]?.label ?? d.status}</Badge></td>
                        <td className="py-3 px-4">{d.status === 'PENDING' ? (<div className="flex justify-end gap-1"><button onClick={() => handleApprove(d.id)} disabled={actionLoading === d.id} className="h-8 w-8 rounded-lg flex items-center justify-center text-success hover:bg-success/10"><Check className="h-4 w-4" /></button><button onClick={() => handleReject(d.id)} disabled={actionLoading === d.id} className="h-8 w-8 rounded-lg flex items-center justify-center text-danger hover:bg-danger/10"><X className="h-4 w-4" /></button></div>) : <span className="text-text-dim text-xs">-</span>}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination page={page} perPage={PER_PAGE} total={(deposits ?? []).length} onPageChange={setPage} />
            </>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-2"><ArrowDownToLine className="h-5 w-5 text-warning" /><h3 className="text-base font-semibold text-white">Yêu cầu rút tiền</h3></div>
          {(withdrawals ?? []).length === 0 ? (
            <EmptyState icon={ArrowDownToLine} title="Chưa có yêu cầu rút" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-text-dim border-b border-border bg-bg-soft/30"><th className="font-medium py-3 px-4">User</th><th className="font-medium py-3 px-4">Bank</th><th className="font-medium py-3 px-4 text-right">Số tiền</th><th className="font-medium py-3 px-4">Trạng thái</th><th className="font-medium py-3 px-4 text-right">Hành động</th></tr></thead>
                <tbody>
                  {(withdrawals ?? []).map((w, i) => (
                    <motion.tr key={w.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }} className="border-b border-border/40 hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-white font-medium">{w.username}</td>
                      <td className="py-3 px-4 text-text-muted">{w.bank}{w.account_number ? ` (${w.account_number})` : ''}</td>
                      <td className="py-3 px-4 text-right font-medium text-white">{formatCurrency(Number(w.amount))}</td>
                      <td className="py-3 px-4"><Badge tone={statusConfig[w.status]?.tone ?? 'neutral'} size="sm" dot>{statusConfig[w.status]?.label ?? w.status}</Badge></td>
                      <td className="py-3 px-4">{w.status === 'PENDING' ? (<div className="flex justify-end gap-1"><button onClick={() => handleWithdrawal(w.id, 'APPROVE')} disabled={actionLoading === w.id} className="h-8 w-8 rounded-lg flex items-center justify-center text-success hover:bg-success/10"><Check className="h-4 w-4" /></button><button onClick={() => handleWithdrawal(w.id, 'REJECT')} disabled={actionLoading === w.id} className="h-8 w-8 rounded-lg flex items-center justify-center text-danger hover:bg-danger/10"><X className="h-4 w-4" /></button></div>) : <span className="text-text-dim text-xs">-</span>}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
