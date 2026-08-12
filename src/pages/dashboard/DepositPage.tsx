import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Landmark, CheckCircle2, Loader2, Sparkles, ShieldCheck, Wallet, ArrowDownToLine } from 'lucide-react';
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
  const bankHolder = (settings?.bank_holder as string) ?? '9L MEDIA';
  const depositMin = Number(settings?.deposit_min ?? 50000);
  const qrUrl = `https://img.vietqr.io/image/${encodeURIComponent(bankName)}-${bankAccount}-compact2.png?amount=${amount}&addInfo=9LMEDIA`;

  const copy = (text: string, field: string) => {
    navigator.clipboard?.writeText(text); setCopiedField(field); setTimeout(() => setCopiedField(null), 1500);
  };

  const submit = async () => {
    if (amount < depositMin) return toast(`Số tiền tối thiểu là ${formatCurrency(depositMin)}`, 'error');
    setSubmitting(true);
    const result = await createDeposit(bankName, amount);
    setSubmitting(false);
    if (result.success) { toast('Yêu cầu nạp tiền đã được tạo.', 'success'); refetch(); setTimeout(() => refetch(), 4000); }
    else toast(result.message ?? 'Tạo yêu cầu nạp tiền thất bại', 'error');
  };

  return <div className="space-y-6">
    <div className="relative overflow-hidden rounded-2xl border border-primary-500/20 bg-gradient-to-br from-primary-500/12 via-bg-card to-secondary-500/10 p-5 sm:p-7">
      <div className="absolute -right-20 -top-24 h-60 w-60 rounded-full bg-primary-500/10 blur-3xl" />
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary-300 mb-2"><Sparkles className="h-3.5 w-3.5"/> 9L Media Wallet</div><h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Nạp tiền</h1><p className="text-sm text-text-muted mt-1.5">Nạp nhanh qua chuyển khoản ngân hàng và theo dõi giao dịch ngay trên dashboard.</p></div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-card/70 px-4 py-3"><Wallet className="h-5 w-5 text-primary-300"/><div><div className="text-[10px] uppercase tracking-wider text-text-dim">Phương thức</div><div className="text-sm font-semibold text-white">VietQR / Bank</div></div></div>
      </div>
    </div>

    <div className="grid lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-5">
        <Card className="overflow-hidden"><div className="px-5 py-4 border-b border-border bg-bg-soft/30 flex items-center gap-3"><div className="h-9 w-9 rounded-xl bg-primary-500/10 flex items-center justify-center"><Landmark className="h-4 w-4 text-primary-300"/></div><div><h3 className="text-sm font-semibold text-white">Thông tin chuyển khoản</h3><p className="text-xs text-text-dim">Sử dụng đúng thông tin bên dưới để hệ thống đối soát</p></div></div><div className="p-5 space-y-2">{[['Ngân hàng',bankName,'bank'],['Số tài khoản',bankAccount,'account'],['Chủ tài khoản',bankHolder,'holder']].map(([k,v,field])=><div key={k} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-bg-soft/30 px-4 py-3"><span className="text-xs text-text-dim">{k}</span><div className="flex items-center gap-2"><span className="text-sm text-white font-semibold text-right">{v}</span><button onClick={()=>copy(v,field)} className="h-8 w-8 rounded-lg flex items-center justify-center text-text-dim hover:text-white hover:bg-white/[0.06]">{copiedField===field?<Check className="h-3.5 w-3.5 text-success-400"/>:<Copy className="h-3.5 w-3.5"/>}</button></div></div>)}</div></Card>

        <Card className="p-5 sm:p-6"><div className="flex items-center gap-2 mb-4"><ArrowDownToLine className="h-4 w-4 text-primary-300"/><div><h3 className="text-sm font-semibold text-white">Số tiền nạp</h3><p className="text-xs text-text-dim">Chọn nhanh hoặc nhập số tiền tùy ý</p></div></div><Input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} placeholder="500000" hint={`Tối thiểu ${formatCurrency(depositMin)}`}/><div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">{quickAmounts.map(a=><button key={a} onClick={()=>setAmount(a)} className={cn('rounded-xl border px-3 py-2.5 text-sm font-medium transition-all',amount===a?'border-primary-500/50 bg-primary-500/10 text-primary-200 shadow-glow':'border-border bg-bg-soft/40 text-text-muted hover:text-white hover:border-border-strong')}>{formatCurrency(a)}</button>)}</div></Card>
      </div>

      <div className="space-y-5"><Card className="overflow-hidden"><div className="px-5 py-4 border-b border-border bg-gradient-to-r from-primary-500/10 to-secondary-500/10"><h3 className="text-sm font-semibold text-white">Thanh toán</h3><p className="text-xs text-text-dim mt-0.5">Quét QR để chuyển khoản</p></div><div className="p-5 text-center"><div className="inline-flex p-3 rounded-2xl bg-white shadow-xl"><img src={qrUrl} alt="VietQR 9L Media" className="h-52 w-52 rounded-lg"/></div><div className="mt-4 rounded-xl border border-border bg-bg-soft/40 p-3"><div className="text-[10px] uppercase tracking-wider text-text-dim">Số tiền chuyển</div><div className="text-xl font-bold text-gradient-primary mt-1">{formatCurrency(amount)}</div></div><Button fullWidth className="mt-4" loading={submitting} onClick={submit}>Tạo yêu cầu nạp tiền</Button><div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-success-400"><ShieldCheck className="h-3.5 w-3.5"/> Giao dịch được ghi nhận trong hệ thống</div></div></Card><Card className="p-5"><h3 className="text-sm font-semibold text-white mb-3">Quy trình nạp tiền</h3><div className="space-y-3 text-xs text-text-muted"><div className="flex gap-3"><span className="h-6 w-6 shrink-0 rounded-full bg-primary-500/10 text-primary-300 flex items-center justify-center font-bold">1</span><span>Chọn số tiền cần nạp và quét mã VietQR.</span></div><div className="flex gap-3"><span className="h-6 w-6 shrink-0 rounded-full bg-primary-500/10 text-primary-300 flex items-center justify-center font-bold">2</span><span>Chuyển khoản đúng tài khoản hiển thị trên hệ thống.</span></div><div className="flex gap-3"><span className="h-6 w-6 shrink-0 rounded-full bg-primary-500/10 text-primary-300 flex items-center justify-center font-bold">3</span><span>Kiểm tra trạng thái giao dịch trong lịch sử nạp tiền.</span></div></div></Card></div>
    </div>

    <Card className="overflow-hidden"><div className="p-5 border-b border-border flex items-center justify-between"><div><h3 className="text-base font-semibold text-white">Lịch sử nạp tiền</h3><p className="text-xs text-text-dim mt-0.5">Theo dõi các yêu cầu nạp gần đây</p></div><Badge tone="neutral" size="sm">{(deposits??[]).length} giao dịch</Badge></div>{(deposits??[]).length===0?<div className="text-center py-14 text-text-muted">Chưa có giao dịch nạp tiền nào</div>:<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-text-dim border-b border-border bg-bg-soft/30"><th className="font-medium py-3 px-4">Mã GD</th><th className="font-medium py-3 px-4">Ngân hàng</th><th className="font-medium py-3 px-4 text-right">Số tiền</th><th className="font-medium py-3 px-4">Trạng thái</th></tr></thead><tbody>{(deposits??[]).map((d,i)=><motion.tr key={d.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*.03}} className="border-b border-border/40 hover:bg-white/[0.02]"><td className="py-3 px-4 font-mono text-xs text-primary-300">{d.txn_code}</td><td className="py-3 px-4 text-text-muted">{d.bank}</td><td className="py-3 px-4 text-right font-semibold text-success-400">+{formatCurrency(Number(d.amount))}</td><td className="py-3 px-4"><Badge tone={d.status==='COMPLETED'?'success':'warning'} size="sm" dot>{d.status==='COMPLETED'?'Hoàn thành':'Đang xử lý'}</Badge></td></motion.tr>)}</tbody></table></div>}</Card>
  </div>;
}
