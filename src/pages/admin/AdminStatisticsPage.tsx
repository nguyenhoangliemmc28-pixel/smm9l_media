import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, ShoppingBag, DollarSign, Activity, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/Table';
import { AreaChart, BarChart, DonutChart } from '@/components/charts/Charts';
import { useQuery } from '@/lib/useQuery';
import { fetchAdminStats, fetchRevenueChart, fetchServiceDistribution, fetchUsersFull, fetchAllOrders } from '@/lib/admin';
import { formatCurrency } from '@/lib/utils';

export function AdminStatisticsPage() {
  const { data: stats, loading } = useQuery(() => fetchAdminStats(), []);
  const { data: revenueChart } = useQuery(() => fetchRevenueChart(), []);
  const { data: serviceDist } = useQuery(() => fetchServiceDistribution(), []);
  const { data: users } = useQuery(() => fetchUsersFull(5, 0, undefined, undefined, undefined), []);
  const { data: orders } = useQuery(() => fetchAllOrders(10, 0, undefined), []);

  const chartData = (revenueChart ?? []).map((d) => d.revenue);
  const chartLabels = (revenueChart ?? []).map((d) => {
    const dt = new Date(d.date);
    return `${dt.getDate()}/${dt.getMonth() + 1}`;
  });
  const barData = (serviceDist ?? []).slice(0, 6).map((d) => ({ label: d.name.slice(0, 2).toUpperCase(), value: d.orders }));

  const donutSegments = useMemo(() => {
    const colors = ['#6D5BFF', '#6EE7FF', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6'];
    return (serviceDist ?? []).slice(0, 5).map((d, i) => ({
      label: d.name,
      value: d.orders,
      color: colors[i % colors.length],
    }));
  }, [serviceDist]);

  const totalRevenue = (revenueChart ?? []).reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = (revenueChart ?? []).reduce((sum, d) => sum + d.orders, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const statCards = [
    { label: 'Tổng doanh thu (30 ngày)', value: formatCurrency(totalRevenue), icon: DollarSign, tone: 'text-success' },
    { label: 'Tổng đơn hàng (30 ngày)', value: String(totalOrders), icon: ShoppingBag, tone: 'text-primary-400' },
    { label: 'Giá trị trung bình/đơn', value: formatCurrency(avgOrderValue), icon: TrendingUp, tone: 'text-accent' },
    { label: 'Tổng người dùng', value: String(stats?.totalUsers ?? 0), icon: Users, tone: 'text-blue-400' },
    { label: 'Đơn hoàn thành', value: String(stats?.completedOrders ?? 0), icon: Activity, tone: 'text-success' },
    { label: 'Đơn đang xử lý', value: String(stats?.pendingOrders ?? 0), icon: BarChart3, tone: 'text-warning' },
  ];

  if (loading && !stats) {
    return (
      <div className="space-y-5">
        <PageHeader title="Thống kê" subtitle="Phân tích dữ liệu hệ thống" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-card" />)}
        </div>
        <div className="skeleton h-80 rounded-card" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Thống kê" subtitle="Phân tích dữ liệu hệ thống" />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-text-dim uppercase tracking-wider">{s.label}</p>
                  <p className="text-xl font-bold text-white mt-2">{s.value}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <s.icon className={`h-5 w-5 ${s.tone}`} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <div className="p-5 border-b border-border">
            <h3 className="text-base font-semibold text-white">Doanh thu 30 ngày qua</h3>
            <p className="text-xs text-text-dim mt-1">Tổng doanh thu theo ngày</p>
          </div>
          <div className="p-6">
            {chartData.length > 0 ? (
              <AreaChart data={chartData} labels={chartLabels} height={280} />
            ) : (
              <div className="text-center text-sm text-text-muted py-16">Chưa có dữ liệu doanh thu</div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-5 border-b border-border">
            <h3 className="text-base font-semibold text-white">Phân bố dịch vụ</h3>
            <p className="text-xs text-text-dim mt-1">Theo số lượng đơn hàng</p>
          </div>
          <div className="p-6 flex items-center justify-center">
            {donutSegments.length > 0 ? (
              <DonutChart segments={donutSegments} size={180} />
            ) : (
              <div className="text-center text-sm text-text-muted py-16">Chưa có dữ liệu</div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <div className="p-5 border-b border-border">
            <h3 className="text-base font-semibold text-white">Top dịch vụ theo đơn hàng</h3>
            <p className="text-xs text-text-dim mt-1">Số lượng đơn theo từng dịch vụ</p>
          </div>
          <div className="p-6">
            {barData.length > 0 ? (
              <BarChart data={barData} height={240} />
            ) : (
              <div className="text-center text-sm text-text-muted py-16">Chưa có dữ liệu</div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-5 border-b border-border">
            <h3 className="text-base font-semibold text-white">Người dùng mới nhất</h3>
            <p className="text-xs text-text-dim mt-1">5 người dùng đăng ký gần đây</p>
          </div>
          <div className="p-4 space-y-2">
            {(users ?? []).length === 0 ? (
              <div className="text-center text-sm text-text-muted py-8">Chưa có người dùng</div>
            ) : (
              (users ?? []).map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-bg-soft/30 border border-border/40">
                  <div>
                    <div className="text-sm font-medium text-white">{u.username}</div>
                    <div className="text-xs text-text-dim">{u.email}</div>
                  </div>
                  <div className="text-xs text-text-dim">{u.role}</div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-5 border-b border-border">
          <h3 className="text-base font-semibold text-white">Đơn hàng gần đây</h3>
          <p className="text-xs text-text-dim mt-1">10 đơn hàng mới nhất</p>
        </div>
        <div className="overflow-x-auto">
          {(orders ?? []).length === 0 ? (
            <div className="text-center text-sm text-text-muted py-12">Chưa có đơn hàng</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-dim border-b border-border bg-bg-soft/30">
                  <th className="font-medium py-3 px-4">User</th>
                  <th className="font-medium py-3 px-4">Dịch vụ</th>
                  <th className="font-medium py-3 px-4 text-right">Số tiền</th>
                  <th className="font-medium py-3 px-4">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {(orders ?? []).map((o) => (
                  <tr key={o.id} className="border-b border-border/40 hover:bg-white/[0.02]">
                    <td className="py-3 px-4 text-white font-medium">{o.username}</td>
                    <td className="py-3 px-4 text-text-muted">{o.service_name}</td>
                    <td className="py-3 px-4 text-right font-semibold text-white">{formatCurrency(o.charge)}</td>
                    <td className="py-3 px-4 text-text-muted">{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
