import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, MousePointerClick, DollarSign, TrendingUp, Copy, Check, Gift } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/lib/toast';
import { fetchAffiliate, ensureAffiliate } from '@/lib/services';
import { formatCurrency, formatNumber, cn } from '@/lib/utils';
import type { IAffiliate } from '@/lib/types';

export function AffiliatePage() {
  const { toast } = useToast();
  const [affiliate, setAffiliate] = useState<IAffiliate | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let data = await fetchAffiliate();
      if (!data) data = await ensureAffiliate();
      setAffiliate(data);
      setLoading(false);
    })();
  }, []);

  const refLink = affiliate ? `https://boosthub.vn/r/${affiliate.code}` : '';

  const copy = () => {
    navigator.clipboard?.writeText(refLink);
    setCopied(true);
    toast('Đã sao chép link giới thiệu', 'success');
    setTimeout(() => setCopied(false), 1500);
  };

  const stats = [
    { label: 'Lượt click', value: formatNumber(affiliate?.clicks ?? 0), icon: MousePointerClick, tone: 'text-accent', bg: 'from-accent/20 to-accent/5' },
    { label: 'Lượt chuyển đổi', value: formatNumber(affiliate?.conversions ?? 0), icon: Users, tone: 'text-primary-300', bg: 'from-primary-500/20 to-primary-500/5' },
    { label: 'Hoa hồng đã nhận', value: formatCurrency(Number(affiliate?.commission ?? 0)), icon: DollarSign, tone: 'text-success-400', bg: 'from-success/20 to-success/5' },
    { label: 'Tỷ lệ chuyển đổi', value: affiliate?.clicks ? `${((affiliate.conversions / affiliate.clicks) * 100).toFixed(1)}%` : '0%', icon: TrendingUp, tone: 'text-warning-400', bg: 'from-warning/20 to-warning/5' },
  ];

  if (loading) {
    return <div className="space-y-5"><div className="skeleton h-8 w-48 rounded" /><div className="skeleton h-32 rounded-card" /></div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Affiliate</h1>
        <p className="text-sm text-text-muted mt-1">Kiếm hoa hồng 15% trên mọi đơn hàng của người được giới thiệu</p>
      </div>

      <Card className="p-6 gradient-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Gift className="h-5 w-5 text-accent" />
              <h3 className="text-base font-semibold text-white">Link giới thiệu của bạn</h3>
            </div>
            <p className="text-sm text-text-muted">Chia sẻ link này. Khi người khác đăng ký và đặt đơn, bạn nhận hoa hồng.</p>
          </div>
          <div className="flex items-center gap-2 rounded-input bg-bg-soft/60 border border-border p-2 pl-3.5 sm:min-w-[340px]">
            <code className="flex-1 text-sm text-white font-mono truncate">{refLink}</code>
            <button onClick={copy} className="h-8 w-8 rounded-md flex items-center justify-center text-text-muted hover:text-white hover:bg-white/[0.06]">
              {copied ? <Check className="h-4 w-4 text-success-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s, i) => (
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

      <Card className="p-6">
        <h3 className="text-base font-semibold text-white mb-2">Cách hoạt động</h3>
        <div className="grid sm:grid-cols-3 gap-4 mt-4">
          {[
            { step: '1', title: 'Chia sẻ link', desc: 'Gửi link giới thiệu của bạn cho bạn bè, khách hàng.' },
            { step: '2', title: 'Họ đăng ký & đặt đơn', desc: 'Khi người được giới thiệu đăng ký và đặt đơn thành công.' },
            { step: '3', title: 'Bạn nhận hoa hồng', desc: '15% phí đơn hàng được cộng vào ví của bạn.' },
          ].map((s) => (
            <div key={s.step} className="rounded-xl border border-border bg-bg-soft/40 p-4">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500/20 to-secondary-500/10 flex items-center justify-center text-primary-300 font-bold text-sm mb-3">{s.step}</div>
              <h4 className="text-sm font-semibold text-white">{s.title}</h4>
              <p className="text-xs text-text-muted mt-1">{s.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
