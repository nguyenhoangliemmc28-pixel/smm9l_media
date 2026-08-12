import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Wallet, ShoppingBag, CalendarDays, TrendingUp, Activity, Ticket,
  Gift, ListOrdered, PlusCircle, CheckCircle2, Clock, XCircle, Loader,
  ArrowUpRight, Sparkles, Boxes, Search,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { AreaChart, BarChart, DonutChart } from '@/components/charts/Charts';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@/lib/useQuery';
import { fetchOrders, fetchWalletTransactions, fetchUnreadNotificationCount, fetchDashboardHomeStats } from '@/lib/services';
import { formatCurrency, formatNumber, timeAgo } from '@/lib/utils';
import type { IOrder, IWalletTransaction } from '@/lib/types';

const statusConfig = {
  COMPLETED: { label: 'Hoàn thành', icon: CheckCircle2, tone: 'success' as const },
  PROCESSING: { label: 'Đang chạy', icon: Loader, tone: 'primary' as const },
  PENDING: { label: 'Chờ xử lý', icon: Clock, tone: 'warning' as const },
  FAILED: { label: 'Lỗi', icon: XCircle, tone: 'danger' as const },
  PARTIAL: { label: 'Một phần', icon: Clock, tone: 'accent' as const },
  CANCELED: { label: 'Đã hủy', icon: XCircle, tone: 'neutral' as const },
  REFUNDED: { label: 'Đã hoàn tiền', icon: CheckCircle2, tone: 'accent' as const },
};

const platformColors = ['#6D5BFF', '#6EE7FF', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6'];

export function DashboardHome() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: orders, loading: ordersLoading } = useQuery(() => fetchOrders({ limit: 6 }), []);
  const { data: transactions } = useQuery(() => fetchWalletTransactions(50), []);
  const { data: unreadNotifs } = useQuery(() => fetchUnreadNotificationCount(), []);
  const { data: homeStats } = useQuery(() => fetchDashboardHomeStats(), []);

  const balance = profile?.balance ?? 0;
  const todayOrders = (orders ?? []).filter((o) => {
    const d = new Date(o.created_at); const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  });
  const monthOrders = (orders ?? []).filter((o) => {
    const d = new Date(o.created_at); const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalSpent = (transactions ?? []).filter((t) => t.type === 'ORDER').reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

  const stats = [
    { label: 'Số dư ví', value: formatCurrency(balance), icon: Wallet, change: '', changeUp: true, tone: 'primary' as const },
    { label: 'Đơn hôm nay', value: String(todayOrders.length), icon: ShoppingBag, change: '', changeUp: true, tone: 'accent' as const },
    { label: 'Đơn tháng này', value: String(monthOrders.length), icon: CalendarDays, change: '', changeUp: true, tone: 'success' as const },
    { label: 'Tổng chi tiêu', value: formatCurrency(totalSpent), icon: TrendingUp, change: '', changeUp: true, tone: 'warning' as const },
    { label: 'Thông báo chưa đọc', value: String(unreadNotifs ?? 0), icon: Activity, change: '', changeUp: true, tone: 'primary' as const },
    { label: 'Ticket đang mở', value: String(homeStats?.open_tickets ?? 0), icon: Ticket, change: '', changeUp: true, tone: 'accent' as const },
    { label: 'Hoa hồng', value: formatCurrency(Number(homeStats?.commission ?? 0)), icon: Gift, change: '', changeUp: true, tone: 'success' as const },
    { label: 'Tổng đơn hàng', value: String(homeStats?.total_orders ?? 0), icon: ListOrdered, change: '', changeUp: true, tone: 'warning' as const },
  ];

  const monthlyData = Array(12).fill(0) as number[];
  (transactions ?? []).forEach((t: IWalletTransaction) => {
    if (t.type === 'ORDER') monthlyData[new Date(t.created_at).getMonth()] += Math.abs(Number(t.amount));
  });

  const platformStats = homeStats?.platform_stats ?? {};
  const donutSegments = Object.entries(platformStats).map(([name, count], i) => ({ label: name, value: count as number, color: platformColors[i % platformColors.length] }));
  const totalPlatformOrders = donutSegments.reduce((s, d) => s + d.value, 0);
  const donutPct = donutSegments.map((d) => ({ ...d, value: totalPlatformOrders > 0 ? Math.round((d.value / totalPlatformOrders) * 100) : 0 }));
  const barData = donutSegments.map((d) => ({ label: d.label.slice(0, 8).toUpperCase(), value: d.value }));

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-primary-500/20 bg-gradient-to-br from-primary-500/10 via-bg-card to-secondary-500/10 p-5 sm:p-6">
        <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-300 mb-2"><Sparkles className="h-3.5 w-3.5" /> 9L Media</div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Xin chào, {profile?.username ?? 'User'} 👋</h1>
            <p className="text-sm text-text-muted mt-1.5">Quản lý đơn hàng, số dư và dịch vụ của bạn trong một nơi.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="md" onClick={() => navigate('/dashboard/services')}><Boxes className="h-4 w-4" /> Xem dịch vụ</Button>
            <Button size="md" onClick={() => navigate('/dashboard/new-order')}><PlusCircle className="h-4 w-4" /> Tạo đơn hàng</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">{stats.map((s, i) => <StatCard key={s.label} {...s} index={i} />)}</div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="p-6 pb-0 flex items-center justify-between"><div><h3 className="text-base font-semibold text-white">Biểu đồ chi tiêu</h3><p className="text-xs text-text-muted mt-0.5">Chi tiêu theo tháng trong năm</p></div><Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/transactions')}>Giao dịch <ArrowUpRight className="h-3.5 w-3.5" /></Button></div>
          <div className="p-6"><AreaChart data={monthlyData} /></div>
        </Card>
        <Card><div className="p-6 pb-0"><h3 className="text-base font-semibold text-white">Phân bố đơn hàng</h3><p className="text-xs text-text-muted mt-0.5">Theo nền tảng</p></div><div className="p-6 flex items-center justify-center">{donutPct.length > 0 ? <DonutChart segments={donutPct} /> : <div className="text-center text-sm text-text-muted py-8">Chưa có dữ liệu</div>}</div></Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="p-6 pb-0 flex items-center justify-between"><div><h3 className="text-base font-semibold text-white">Đơn hàng gần đây</h3><p className="text-xs text-text-muted mt-0.5">6 đơn hàng mới nhất</p></div><Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/orders')}>Xem tất cả <ArrowUpRight className="h-3.5 w-3.5" /></Button></div>
          <div className="p-4 overflow-x-auto">{ordersLoading ? <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div> : (orders ?? []).length === 0 ? <div className="text-center py-10 text-text-muted"><Search className="h-6 w-6 mx-auto mb-2 opacity-50" /><p>Chưa có đơn hàng nào.</p><Button size="sm" className="mt-3" onClick={() => navigate('/dashboard/new-order')}>Tạo đơn đầu tiên</Button></div> : <table className="w-full text-sm"><thead><tr className="text-left text-xs text-text-dim border-b border-border"><th className="font-medium py-2.5 px-2">ID</th><th className="font-medium py-2.5 px-2">Dịch vụ</th><th className="font-medium py-2.5 px-2 text-right">SL</th><th className="font-medium py-2.5 px-2 text-right">Phí</th><th className="font-medium py-2.5 px-2">Trạng thái</th><th className="font-medium py-2.5 px-2">Thời gian</th></tr></thead><tbody>{(orders ?? []).map((o: IOrder, i) => { const st = statusConfig[o.status as keyof typeof statusConfig] ?? statusConfig.PENDING; return <motion.tr key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="border-b border-border/50 hover:bg-white/[0.02]"><td className="py-3 px-2 font-mono text-xs text-primary-300">{o.id.slice(0, 8)}</td><td className="py-3 px-2"><div className="text-white font-medium">{o.service?.name ?? '—'}</div><div className="text-xs text-text-dim truncate max-w-[160px]">{o.link}</div></td><td className="py-3 px-2 text-right text-text-muted">{formatNumber(o.quantity)}</td><td className="py-3 px-2 text-right font-medium text-white">{formatCurrency(Number(o.charge))}</td><td className="py-3 px-2"><Badge tone={st.tone} dot>{st.label}</Badge></td><td className="py-3 px-2 text-xs text-text-dim whitespace-nowrap">{timeAgo(o.created_at)}</td></motion.tr>; })}</tbody></table>}</div>
        </Card>
        <Card><div className="p-6 pb-0"><h3 className="text-base font-semibold text-white">Nền tảng</h3><p className="text-xs text-text-muted mt-0.5">Phân bố đơn hàng</p></div><div className="p-6">{barData.length > 0 ? <BarChart data={barData} /> : <div className="text-center text-sm text-text-muted py-8">Chưa có dữ liệu</div>}</div></Card>
      </div>
    </div>
  );
}
