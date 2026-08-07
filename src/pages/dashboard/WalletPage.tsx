import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, Gift, RotateCcw, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Send, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { AreaChart } from '@/components/charts/Charts';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { useQuery } from '@/lib/useQuery';
import { fetchWalletTransactions, fetchWalletStats, requestWithdraw, fetchWithdrawals, fetchPublicSettings } from '@/lib/services';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { IWalletTransaction, IWithdraw } from '@/lib/types';

const typeConfig = {
  DEPOSIT: { label: 'Nạp tiền', tone: 'success' as const, icon: ArrowDownRight },
  ORDER: { label: 'Đơn hàng', tone: 'primary' as const, icon: ArrowUpRight },
  REFUND: { label: 'Hoàn tiền', tone: 'accent' as const, icon: RotateCcw },
  COMMISSION: { label: 'Hoa hồng', tone: 'warning' as const, icon: Gift },
  WITHDRAW: { label: 'Rút tiền', tone: 'danger' as const, icon: ArrowUpRight },
  BONUS: { label: 'Thưởng', tone: 'success' as const, icon: ArrowDownRight },
  TRANSFER: { label: 'Chuyển khoản', tone: 'neutral' as const, icon: ArrowLeftRight },
};

const withdrawStatusConfig = {
  PENDING: { label: 'Chờ duyệt', tone: 'warning' as const },
  COMPLETED: { label: 'Đã chuyển', tone: 'success' as const },
  REJECTED: { label: 'Từ chối', tone: 'danger' as const },
};

export function WalletPage() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { data: transactions, loading } = useQuery(() => fetchWalletTransactions(), []);
  const { data: stats } = useQuery(() => fetchWalletStats(), []);
  const { data: withdrawals } = useQuery(() => fetchWithdrawals(), []);
  const { data: settings } = useQuery(() => fetchPublicSettings(), []);

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: 0, bank: '', accountNumber: '', accountName: '' });
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const balance = profile?.balance ?? 0;
  const withdrawMin = Number(settings?.withdraw_min ?? 50000);
  const withdrawFee = Number(settings?.withdraw_fee ?? 0);

  const walletStats = [
    { label: 'Số dư khả dụng', value: formatCurrency(balance), icon: Wallet, tone: 'text-primary-300', bg: 'from-primary-500/20 to-primary-500/5' },
    { label: 'Đã nạp', value: formatCurrency(stats?.deposited ?? 0), icon: TrendingUp, tone: 'text-success-400', bg: 'from-success/20 to-success/5' },
    { label: 'Đã chi', value: formatCurrency(stats?.spent ?? 0), icon: TrendingDown, tone: 'text-danger-400', bg: 'from-danger/20 to-danger/5' },
    { label: 'Hoa hồng', value: formatCurrency(stats?.commission ?? 0), icon: Gift, tone: 'text-accent', bg: 'from-accent/20 to-accent/5' },
  ];

  const monthlyData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  (transactions ?? []).forEach((t: IWalletTransaction) => {
    const m = new Date(t.created_at).getMonth();
    monthlyData[m] += Math.abs(Number(t.amount));
  });

  const handleWithdraw = async () => {
    if (withdrawForm.amount < withdrawMin) { toast(`Số tiền rút tối thiểu ${formatCurrency(withdrawMin)}`, 'error'); return; }
    if (withdrawForm.amount > balance) { toast('Số dư không đủ', 'error'); return; }
    if (!withdrawForm.bank || !withdrawForm.accountNumber || !withdrawForm.accountName) { toast('Vui lòng nhập đầy đủ thông tin', 'error'); return; }
    setWithdrawLoading(true);
    const result = await requestWithdraw(withdrawForm.amount, withdrawForm.bank, withdrawForm.accountNumber, withdrawForm.accountName);
    setWithdrawLoading(false);
    if (result.success) {
      toast('Yêu cầu rút tiền đã được tạo. Vui lòng chờ admin duyệt.', 'success');
      setWithdrawOpen(false);
      setWithdrawForm({ amount: 0, bank: '', accountNumber: '', accountName: '' });
      refreshProfile();
    } else {
      toast(result.message ?? 'Lỗi khi tạo yêu cầu rút tiền', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ví của tôi</h1>
          <p className="text-sm text-text-muted mt-1">Quản lý số dư và lịch sử giao dịch</p>
        </div>
        <Button leftIcon={<ArrowUpRight className="h-4 w-4" />} onClick={() => setWithdrawOpen(true)}>Rút tiền</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {walletStats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card hover className="p-5">
              <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${s.bg} flex items-center justify-center mb-4`}>
                <s.icon className={`h-5 w-5 ${s.tone}`} />
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">{s.value}</div>
              <div className="text-sm text-text-muted mt-1">{s.label}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <div className="p-6 pb-0">
          <h3 className="text-base font-semibold text-white">Biểu đồ giao dịch</h3>
          <p className="text-xs text-text-muted mt-0.5">Biến động 12 tháng</p>
        </div>
        <div className="p-6"><AreaChart data={monthlyData} /></div>
      </Card>

      {(withdrawals ?? []).length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-6 pb-4">
            <h3 className="text-base font-semibold text-white">Lịch sử rút tiền</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-dim border-b border-border bg-bg-soft/30">
                  <th className="font-medium py-3 px-4">Ngân hàng</th>
                  <th className="font-medium py-3 px-4">Số tài khoản</th>
                  <th className="font-medium py-3 px-4 text-right">Số tiền</th>
                  <th className="font-medium py-3 px-4">Trạng thái</th>
                  <th className="font-medium py-3 px-4">Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {(withdrawals ?? []).map((w: IWithdraw, i) => (
                  <motion.tr key={w.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-b border-border/40 hover:bg-white/[0.02]">
                    <td className="py-3 px-4 text-white font-medium">{w.bank}</td>
                    <td className="py-3 px-4 text-text-muted">{w.account_number} ({w.account_name})</td>
                    <td className="py-3 px-4 text-right font-semibold text-white">{formatCurrency(Number(w.amount))}</td>
                    <td className="py-3 px-4"><Badge tone={withdrawStatusConfig[w.status as keyof typeof withdrawStatusConfig]?.tone ?? 'neutral'} size="sm" dot>{withdrawStatusConfig[w.status as keyof typeof withdrawStatusConfig]?.label ?? w.status}</Badge></td>
                    <td className="py-3 px-4 text-xs text-text-dim whitespace-nowrap">{formatDate(w.created_at)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="p-6 pb-4">
          <h3 className="text-base font-semibold text-white">Lịch sử giao dịch</h3>
        </div>
        {loading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
          </div>
        ) : (transactions ?? []).length === 0 ? (
          <div className="text-center py-12 text-text-muted">Chưa có giao dịch nào</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-dim border-b border-border bg-bg-soft/30">
                  <th className="font-medium py-3 px-4">Loại</th>
                  <th className="font-medium py-3 px-4">Nội dung</th>
                  <th className="font-medium py-3 px-4 text-right">Số tiền</th>
                  <th className="font-medium py-3 px-4 text-right">Số dư sau</th>
                  <th className="font-medium py-3 px-4">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {(transactions ?? []).map((t: IWalletTransaction, i) => {
                  const tc = typeConfig[t.type as keyof typeof typeConfig] ?? typeConfig.TRANSFER;
                  return (
                    <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-b border-border/40 hover:bg-white/[0.02]">
                      <td className="py-3 px-4"><Badge tone={tc.tone} size="sm">{tc.label}</Badge></td>
                      <td className="py-3 px-4 text-text-muted">{t.description}</td>
                      <td className={`py-3 px-4 text-right font-semibold ${Number(t.amount) > 0 ? 'text-success-400' : 'text-danger-400'}`}>
                        {Number(t.amount) > 0 ? '+' : ''}{formatCurrency(Number(t.amount))}
                      </td>
                      <td className="py-3 px-4 text-right text-text-muted">{formatCurrency(Number(t.balance_after))}</td>
                      <td className="py-3 px-4 text-xs text-text-dim whitespace-nowrap">{formatDate(t.created_at)}</td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} title="Rút tiền" size="md">
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-bg-soft/40 border border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">Số dư khả dụng</span>
              <span className="text-sm font-semibold text-white">{formatCurrency(balance)}</span>
            </div>
            {withdrawFee > 0 && <div className="flex items-center justify-between mt-1"><span className="text-xs text-text-dim">Phí rút</span><span className="text-xs text-text-dim">{formatCurrency(withdrawFee)}</span></div>}
            <div className="flex items-center justify-between mt-1"><span className="text-xs text-text-dim">Tối thiểu</span><span className="text-xs text-text-dim">{formatCurrency(withdrawMin)}</span></div>
          </div>
          <Input label="Số tiền rút" type="number" value={withdrawForm.amount || ''} onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: parseFloat(e.target.value) || 0 })} />
          <Input label="Tên ngân hàng" value={withdrawForm.bank} onChange={(e) => setWithdrawForm({ ...withdrawForm, bank: e.target.value })} placeholder="VD: MB Bank, Vietcombank..." />
          <Input label="Số tài khoản" value={withdrawForm.accountNumber} onChange={(e) => setWithdrawForm({ ...withdrawForm, accountNumber: e.target.value })} />
          <Input label="Tên chủ tài khoản" value={withdrawForm.accountName} onChange={(e) => setWithdrawForm({ ...withdrawForm, accountName: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setWithdrawOpen(false)}>Hủy</Button>
            <Button loading={withdrawLoading} leftIcon={<Send className="h-4 w-4" />} onClick={handleWithdraw}>Tạo yêu cầu</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
