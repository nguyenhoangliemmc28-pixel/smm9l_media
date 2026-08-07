import { motion } from 'framer-motion';
import { Wallet, TrendingUp, Activity, ShoppingCart, ArrowUpRight } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';

const stats = [
  { label: 'Số dư ví', value: 24500000, icon: Wallet, color: 'text-primary-300', bg: 'bg-primary-500/10' },
  { label: 'Đơn hôm nay', value: 47, icon: ShoppingCart, color: 'text-accent-500', bg: 'bg-accent/10' },
  { label: 'Doanh thu tháng', value: 184500000, icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
  { label: 'Lượt truy cập', value: 12840, icon: Activity, color: 'text-warning', bg: 'bg-warning/10' },
];

const recentOrders = [
  { id: '#48201', service: 'Facebook Page Likes', status: 'Hoàn thành', amount: 120000, tone: 'text-success' },
  { id: '#48199', service: 'TikTok Followers', status: 'Đang chạy', amount: 180000, tone: 'text-primary-300' },
  { id: '#48197', service: 'YouTube Views', status: 'Hoàn thành', amount: 15000, tone: 'text-success' },
  { id: '#48195', service: 'Instagram Followers', status: 'Một phần', amount: 20000, tone: 'text-accent-500' },
];

const categories = ['Facebook', 'TikTok', 'Instagram', 'YouTube', 'Telegram', 'Shopee'];

export function HeroDashboardPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-gradient-to-br from-primary-500/20 to-accent/10 rounded-card blur-2xl" />
      <div className="relative glass-strong rounded-card p-5 shadow-card">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-danger/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-warning/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-success/80" />
          </div>
          <span className="text-xs text-white/40 font-mono">dashboard.smmboost.vn</span>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="rounded-btn bg-bg-card border border-border p-3.5"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${s.color}`} strokeWidth={1.8} />
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-white/30" />
                </div>
                <p className="text-xs text-white/50 mb-1">{s.label}</p>
                <p className="text-base font-bold text-white truncate">
                  {s.label.includes('Doanh thu') || s.label.includes('Số dư') ? formatCurrency(s.value) : formatNumber(s.value)}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Chart placeholder */}
        <div className="rounded-btn bg-bg-card border border-border p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-white/80">Biểu đồ doanh thu</p>
            <span className="text-xs text-success">+24.5%</span>
          </div>
          <div className="flex items-end gap-1.5 h-20">
            {[40, 65, 45, 80, 55, 90, 70, 95, 60, 85, 75, 100].map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 0.5 + i * 0.05, duration: 0.4, ease: 'easeOut' }}
                className="flex-1 bg-gradient-to-t from-primary-500/40 to-primary-400 rounded-t"
              />
            ))}
          </div>
        </div>

        {/* Recent orders */}
        <div className="rounded-btn bg-bg-card border border-border p-4">
          <p className="text-sm font-medium text-white/80 mb-3">Đơn gần đây</p>
          <div className="space-y-2.5">
            {recentOrders.map((o, i) => (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + i * 0.08 }}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-white/40 font-mono shrink-0">{o.id}</span>
                  <span className="text-white/70 truncate">{o.service}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={o.tone}>{o.status}</span>
                  <span className="text-white/80 font-medium">{formatCurrency(o.amount)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Categories strip */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {categories.map((c) => (
            <span key={c} className="px-2.5 py-1 rounded-full bg-white/5 border border-border text-xs text-white/60">
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
