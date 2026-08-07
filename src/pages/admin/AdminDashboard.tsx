import { motion } from 'framer-motion';
import { DollarSign, Users, ListOrdered, CheckCircle2, AlertTriangle, Activity, Server, Ticket } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { AreaChart, BarChart, DonutChart } from '@/components/charts/Charts';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useQuery } from '@/lib/useQuery';
import { fetchAdminStats, fetchUsersFull, fetchAllOrders, fetchProviders, fetchAllTickets, fetchDashboardOverview, fetchRevenueChart, fetchServiceDistribution } from '@/lib/admin';
import { formatCurrency, formatDate } from '@/lib/utils';

export function AdminDashboard() {
  const { data: stats, loading } = useQuery(() => fetchAdminStats(), []);
  const { data: overview } = useQuery(() => fetchDashboardOverview(), []);
  const { data: users } = useQuery(() => fetchUsersFull(5, 0), []);
  const { data: orders } = useQuery(() => fetchAllOrders(10, 0), []);
  const { data: providers } = useQuery(() => fetchProviders(), []);
  const { data: tickets } = useQuery(() => fetchAllTickets(5, 0, 'OPEN'), []);
  const { data: revenueChart } = useQuery(() => fetchRevenueChart(), []);
  const { data: serviceDist } = useQuery(() => fetchServiceDistribution(), []);

  const statCards = [
    { label: 'Doanh thu hôm nay', value: formatCurrency(Number(overview?.todayRevenue ?? 0)), icon: DollarSign, change: '', changeUp: true, tone: 'primary' as const },
    { label: 'Doanh thu tháng', value: formatCurrency(Number(overview?.monthRevenue ?? 0)), icon: DollarSign, change: '', changeUp: true, tone: 'success' as const },
    { label: 'Tổng người dùng', value: String(stats?.totalUsers ?? 0), icon: Users, change: '', changeUp: true, tone: 'accent' as const },
    { label: 'Tổng đơn hàng', value: String(stats?.totalOrders ?? 0), icon: ListOrdered, change: '', changeUp: true, tone: 'success' as const },
    { label: 'Đơn hoàn thành', value: String(stats?.completedOrders ?? 0), icon: CheckCircle2, change: '', changeUp: true, tone: 'warning' as const },
    { label: 'Đơn đang chờ', value: String(stats?.pendingOrders ?? 0), icon: Activity, change: '', changeUp: true, tone: 'primary' as const },
    { label: 'Đơn lỗi', value: String(stats?.failedOrders ?? 0), icon: AlertTriangle, change: '', changeUp: false, tone: 'danger' as const },
    { label: 'Nạp tiền chờ duyệt', value: String(overview?.pendingDeposits ?? 0), icon: DollarSign, change: '', changeUp: true, tone: 'warning' as const },
  ];

  const donutSegments = [
    { label: 'Hoàn thành', value: stats?.completedOrders ?? 0, color: '#22C55E' },
    { label: 'Đang chờ', value: stats?.pendingOrders ?? 0, color: '#6D5BFF' },
    { label: 'Lỗi', value: stats?.failedOrders ?? 0, color: '#EF4444' },
    { label: 'Khác', value: Math.max(0, (stats?.totalOrders ?? 0) - (stats?.completedOrders ?? 0) - (stats?.pendingOrders ?? 0) - (stats?.failedOrders ?? 0)), color: '#F59E0B' },
  ];

  // Wire revenue chart to real data
  const chartData = (revenueChart ?? []).map((d) => Number(d.revenue));
  const chartLabels = (revenueChart ?? []).map((d) => {
    const date = new Date(d.date);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  });

  // Wire bar chart to real service distribution
  const barData = (serviceDist ?? []).map((s) => ({
    label: s.name.length > 6 ? s.name.slice(0, 4) + '..' : s.name,
    value: s.orders,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-text-muted mt-1">Tổng quan toàn bộ hệ thống</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-32 rounded-card" />)}</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">{statCards.map((s, i) => <StatCard key={s.label} {...s} index={i} />)}</div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="p-6 pb-0"><h3 className="text-base font-semibold text-white">Biểu đồ doanh thu</h3><p className="text-xs text-text-muted mt-0.5">Doanh thu 30 ngày gần nhất</p></div>
          <div className="p-6"><AreaChart data={chartData} labels={chartLabels} /></div>
        </Card>
        <Card>
          <div className="p-6 pb-0"><h3 className="text-base font-semibold text-white">Trạng thái đơn hàng</h3><p className="text-xs text-text-muted mt-0.5">Phân bố theo trạng thái</p></div>
          <div className="p-6 flex items-center justify-center"><DonutChart segments={donutSegments} /></div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="p-6 pb-4"><h3 className="text-base font-semibold text-white">Đơn hàng gần đây</h3></div>
          {(orders ?? []).length === 0 ? (
            <div className="text-center py-10 text-text-muted">Chưa có đơn hàng</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-text-dim border-b border-border bg-bg-soft/30"><th className="font-medium py-3 px-4">User</th><th className="font-medium py-3 px-4">Dịch vụ</th><th className="font-medium py-3 px-4 text-right">Chi phí</th><th className="font-medium py-3 px-4">Trạng thái</th><th className="font-medium py-3 px-4">Ngày</th></tr></thead>
                <tbody>
                  {(orders ?? []).slice(0, 8).map((o, i) => (
                    <motion.tr key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="border-b border-border/40 hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-white font-medium">{o.username}</td>
                      <td className="py-3 px-4 text-text-muted truncate max-w-[160px]">{o.service_name}</td>
                      <td className="py-3 px-4 text-right font-medium text-white">{formatCurrency(o.charge)}</td>
                      <td className="py-3 px-4"><Badge tone="neutral" size="sm">{o.status}</Badge></td>
                      <td className="py-3 px-4 text-xs text-text-dim whitespace-nowrap">{formatDate(o.created_at)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5"><h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Server className="h-4 w-4 text-primary-300" /> Providers</h3><div className="text-2xl font-bold text-white">{providers?.length ?? 0}</div><p className="text-xs text-text-muted mt-1">Nhà cung cấp API</p></Card>
          <Card className="p-5"><h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Ticket className="h-4 w-4 text-warning" /> Tickets mở</h3><div className="text-2xl font-bold text-white">{tickets?.length ?? 0}</div><p className="text-xs text-text-muted mt-1">Cần phản hồi</p></Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-accent" /> Người dùng mới</h3>
            <div className="space-y-2">
              {(users ?? []).slice(0, 3).map((u) => (
                <div key={u.id} className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-xs font-semibold text-white">{u.username?.[0]?.toUpperCase()}</div>
                  <div className="flex-1 min-w-0"><div className="text-sm text-white truncate">{u.username}</div><div className="text-xs text-text-dim truncate">{u.email}</div></div>
                </div>
              ))}
              {(users ?? []).length === 0 && <p className="text-xs text-text-muted">Chưa có người dùng</p>}
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <div className="p-6 pb-0"><h3 className="text-base font-semibold text-white">Top dịch vụ</h3><p className="text-xs text-text-muted mt-0.5">Số đơn theo dịch vụ (top 10)</p></div>
        <div className="p-6">
          {barData.length > 0 ? <BarChart data={barData} /> : <div className="text-center text-sm text-text-muted py-8">Chưa có dữ liệu</div>}
        </div>
      </Card>
    </div>
  );
}
