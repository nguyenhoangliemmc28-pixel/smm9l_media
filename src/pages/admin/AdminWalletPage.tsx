import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TablePagination, EmptyState, PageHeader } from '@/components/ui/Table';
import { useQuery } from '@/lib/useQuery';
import { fetchAllWalletTransactions } from '@/lib/admin';
import { formatCurrency, formatDate } from '@/lib/utils';

const PER_PAGE = 15;

const typeConfig: Record<string, { tone: 'success' | 'danger' | 'warning' | 'info' | 'accent' | 'neutral'; label: string }> = {
  DEPOSIT: { tone: 'success', label: 'Nạp tiền' }, ORDER: { tone: 'danger', label: 'Đơn hàng' }, REFUND: { tone: 'info', label: 'Hoàn tiền' },
  COMMISSION: { tone: 'accent', label: 'Hoa hồng' }, BONUS: { tone: 'success', label: 'Thưởng' }, WITHDRAW: { tone: 'warning', label: 'Rút tiền' }, TRANSFER: { tone: 'neutral', label: 'Chuyển khoản' },
};

export function AdminWalletPage() {
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: transactions, loading } = useQuery(() => fetchAllWalletTransactions(200, 0, typeFilter), [typeFilter]);
  useEffect(() => { setPage(1); }, [typeFilter, search]);

  const filtered = (transactions ?? []).filter((t) => !search || t.username.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase()));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const totalIn = (transactions ?? []).filter((t) => t.amount > 0).reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = (transactions ?? []).filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Quản lý ví" subtitle="Tất cả giao dịch trong hệ thống" />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-5"><div className="flex items-center gap-3"><div className="h-11 w-11 rounded-xl bg-success/15 flex items-center justify-center"><ArrowDownLeft className="h-5 w-5 text-success" /></div><div><div className="text-2xl font-bold text-white">{formatCurrency(totalIn)}</div><div className="text-sm text-text-muted">Tổng tiền vào</div></div></div></Card>
        <Card className="p-5"><div className="flex items-center gap-3"><div className="h-11 w-11 rounded-xl bg-danger/15 flex items-center justify-center"><ArrowUpRight className="h-5 w-5 text-danger" /></div><div><div className="text-2xl font-bold text-white">{formatCurrency(totalOut)}</div><div className="text-sm text-text-muted">Tổng tiền ra</div></div></div></Card>
        <Card className="p-5"><div className="flex items-center gap-3"><div className="h-11 w-11 rounded-xl bg-primary-500/15 flex items-center justify-center"><Wallet className="h-5 w-5 text-primary-300" /></div><div><div className="text-2xl font-bold text-white">{formatCurrency(totalIn - totalOut)}</div><div className="text-sm text-text-muted">Net flow</div></div></div></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 max-w-md"><Input placeholder="Tìm theo user, mô tả..." value={search} onChange={(e) => setSearch(e.target.value)} leftIcon={<Search className="h-4 w-4" />} /></div>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} containerClassName="w-40"><option value="all">Tất cả loại</option><option value="DEPOSIT">Nạp tiền</option><option value="ORDER">Đơn hàng</option><option value="REFUND">Hoàn tiền</option><option value="COMMISSION">Hoa hồng</option><option value="BONUS">Thưởng</option><option value="WITHDRAW">Rút tiền</option></Select>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
        ) : paginated.length === 0 ? (
          <EmptyState icon={Wallet} title="Chưa có giao dịch" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-dim border-b border-border bg-bg-soft/30">
                    <th className="font-medium py-3 px-4">Người dùng</th><th className="font-medium py-3 px-4">Loại</th><th className="font-medium py-3 px-4 text-right">Số tiền</th><th className="font-medium py-3 px-4 text-right">Trước</th><th className="font-medium py-3 px-4 text-right">Sau</th><th className="font-medium py-3 px-4">Mô tả</th><th className="font-medium py-3 px-4">Ngày</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((t, i) => (
                    <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }} className="border-b border-border/40 hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-white font-medium">{t.username}</td>
                      <td className="py-3 px-4"><Badge tone={typeConfig[t.type]?.tone ?? 'neutral'} size="sm">{typeConfig[t.type]?.label ?? t.type}</Badge></td>
                      <td className={`py-3 px-4 text-right font-medium ${Number(t.amount) > 0 ? 'text-success' : 'text-danger'}`}>{Number(t.amount) > 0 ? '+' : ''}{formatCurrency(Number(t.amount))}</td>
                      <td className="py-3 px-4 text-right text-text-muted">{formatCurrency(Number(t.balance_before))}</td>
                      <td className="py-3 px-4 text-right text-text-muted">{formatCurrency(Number(t.balance_after))}</td>
                      <td className="py-3 px-4 text-text-muted max-w-[200px] truncate">{t.description}</td>
                      <td className="py-3 px-4 text-xs text-text-dim whitespace-nowrap">{formatDate(t.created_at)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination page={page} perPage={PER_PAGE} total={filtered.length} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
