import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Landmark, CheckCircle2, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/lib/toast';
import { useQuery } from '@/lib/useQuery';
import { fetchDeposits, createDeposit, fetchPublicSettings } from '@/lib/services';
import { formatCurrency, cn } from '@/lib/utils';

const quickAmounts = [50000, 100000, 200000, 500000, 1000000, 2000000];

export function DepositPage() {
  const { toast } = useToast();
  const { data: deposits, refetch } = useQuery(() => fetchDeposits(), []);
  const { data: settings } = useQuery(() => fetchPublicSettings(), []);
  const [amount, setAmount] = useState(500000);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const bankName = (settings?.bank_name as string) ?? 'MB Bank';
  const bankAccount = (settings?.bank_account as string) ?? '0987654321';
  const bankHolder = (settings?.bank_holder as string) ?? 'CONG TY BOOSTHUB';
  const depositMin = Number(settings?.deposit_min ?? 50000);

  // Generate VietQR image URL (free public API, no key required)
  const qrUrl = `https://img.vietqr.io/image/${encodeURIComponent(bankName)}-${bankAccount}-compact2.png?amount=${amount}&addInfo=BOOSTHUB`;

  const copy = (text: string, field: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const submit = async () => {
    if (amount < depositMin) {
      toast(`Số tiền tối thiểu là ${formatCurrency(depositMin)}`, 'error');
      return;
    }
    setSubmitting(true);
    const result = await createDeposit(bankName, amount);
    setSubmitting(false);
    if (result.success) {
      toast('Yêu cầu nạp tiền đã tạo. Tiền sẽ tự động cộng sau vài giây.', 'success');
      refetch();
      setTimeout(() => refetch(), 4000);
    } else {
      toast(result.message ?? 'Tạo yêu cầu nạp tiền thất bại', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nạp tiền</h1>
        <p className="text-sm text-text-muted mt-1">Chuyển khoản tự động đối soát qua VietQR</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6">
            <h3 className="text-base font-semibold text-white mb-4">Thông tin chuyển khoản</h3>
            <div className="p-4 rounded-xl bg-bg-soft/40 border border-border space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary-500/20 to-primary-500/5 flex items-center justify-center">
                  <Landmark className="h-5 w-5 text-primary-300" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{bankName}</div>
                  <div className="text-xs text-text-dim">Chuyển khoản ngân hàng</div>
                </div>
              </div>
              {[
                ['Ngân hàng', bankName, 'bank'],
                ['Số tài khoản', bankAccount, 'account'],
                ['Chủ tài khoản', bankHolder, 'holder'],
              ].map(([k, v, field]) => (
                <div key={k as string} className="flex items-center justify-between gap-2 py-1.5 border-b border-border/40 last:border-0">
                  <span className="text-xs text-text-dim">{k}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-white font-medium">{v}</span>
                    <button onClick={() => copy(v as string, field as string)} className="h-7 w-7 rounded-md flex items-center justify-center text-text-dim hover:text-white hover:bg-white/[0.06]">
                      {copiedField === field ? <Check className="h-3.5 w-3.5 text-success-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-base font-semibold text-white mb-4">Nhập số tiền</h3>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="500000"
              hint={`Số tiền tối thiểu: ${formatCurrency(depositMin)}`}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {quickAmounts.map((a) => (
                <button
                  key={a}
                  onClick={() => setAmount(a)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    amount === a ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30' : 'glass text-text-muted hover:text-white',
                  )}
                >
                  {formatCurrency(a)}
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-6 text-center">
            <h3 className="text-base font-semibold text-white mb-4">Quét mã QR</h3>
            <div className="relative inline-flex items-center justify-center p-3 rounded-2xl bg-white mb-4">
              {amount > 0 ? (
                <img src={qrUrl} alt="VietQR" className="h-44 w-44 rounded-lg" />
              ) : (
                <div className="h-44 w-44 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                </div>
              )}
            </div>
            <div className="space-y-2 text-left">
              <div className="flex items-center justify-between gap-2 py-1.5 border-b border-border/40">
                <span className="text-xs text-text-dim">Số tiền</span>
                <span className="text-sm text-white font-medium">{formatCurrency(amount)}</span>
              </div>
            </div>
            <Button fullWidth className="mt-4" loading={submitting} onClick={submit}>
              Tạo yêu cầu nạp tiền
            </Button>
            <div className="mt-3 rounded-lg bg-success/10 border border-success/30 px-3 py-2.5 text-xs text-success-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Tiền sẽ tự động cộng vào ví sau khi tạo yêu cầu
            </div>
          </Card>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="p-6 pb-4">
          <h3 className="text-base font-semibold text-white">Lịch sử nạp tiền</h3>
        </div>
        {(deposits ?? []).length === 0 ? (
          <div className="text-center py-12 text-text-muted">Chưa có giao dịch nạp tiền nào</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-dim border-b border-border bg-bg-soft/30">
                  <th className="font-medium py-3 px-4">Mã GD</th>
                  <th className="font-medium py-3 px-4">Ngân hàng</th>
                  <th className="font-medium py-3 px-4 text-right">Số tiền</th>
                  <th className="font-medium py-3 px-4">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {(deposits ?? []).map((d, i) => (
                  <motion.tr key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b border-border/40 hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-mono text-xs text-primary-300">{d.txn_code}</td>
                    <td className="py-3 px-4 text-text-muted">{d.bank}</td>
                    <td className="py-3 px-4 text-right font-semibold text-success-400">+{formatCurrency(Number(d.amount))}</td>
                    <td className="py-3 px-4">
                      <Badge tone={d.status === 'COMPLETED' ? 'success' : 'warning'} size="sm" dot>
                        {d.status === 'COMPLETED' ? 'Hoàn thành' : 'Đang xử lý'}
                      </Badge>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
