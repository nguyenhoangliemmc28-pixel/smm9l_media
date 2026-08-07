import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Eye, XCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { OrderStatusBadge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { TablePagination, EmptyState, PageHeader } from '@/components/ui/Table';
import { useToast } from '@/lib/toast';
import { useQuery } from '@/lib/useQuery';
import { fetchAllOrders, updateOrderStatus, syncAllOrders } from '@/lib/admin';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { IAdminOrder } from '@/lib/types';

const PER_PAGE = 10;

export function AdminOrdersPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detailOrder, setDetailOrder] = useState<IAdminOrder | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncAllOrders();
      if (result.success) toast(`Đã đồng bộ ${result.synced ?? 0} đơn hàng`, 'success');
      else toast(result.message ?? 'Đồng bộ thất bại', 'error');
      refetch();
    } catch (e: any) { toast(e.message ?? 'Lỗi', 'error'); }
    finally { setSyncing(false); }
  };

  const { data: orders, loading, refetch } = useQuery(() => fetchAllOrders(200, 0, statusFilter), [statusFilter]);

  useEffect(() => { setPage(1); }, [statusFilter, search]);

  const filtered = (orders ?? []).filter((o) =>
    !search || o.username.toLowerCase().includes(search.toLowerCase()) || o.service_name?.toLowerCase().includes(search.toLowerCase()) || o.id.includes(search)
  );
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleStatus = async (id: string, status: string) => {
    setActionLoading(id);
    try { await updateOrderStatus(id, status); toast('Đã cập nhật trạng thái', 'success'); refetch(); if (detailOrder?.id === id) setDetailOrder({ ...detailOrder, status: status as any }); }
    catch (e: any) { toast(e.message ?? 'Lỗi', 'error'); }
    finally { setActionLoading(null); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <PageHeader title="Quản lý đơn hàng" subtitle={`${filtered.length} đơn hàng`} />
        <Button variant="outline" size="sm" loading={syncing} leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={handleSync}>Đồng bộ Provider</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 max-w-md"><Input placeholder="Tìm theo user, dịch vụ, ID..." value={search} onChange={(e) => setSearch(e.target.value)} leftIcon={<Search className="h-4 w-4" />} /></div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} containerClassName="w-40">
          <option value="all">Tất cả trạng thái</option><option value="PENDING">Chờ xử lý</option><option value="PROCESSING">Đang chạy</option><option value="COMPLETED">Hoàn thành</option><option value="PARTIAL">Một phần</option><option value="CANCELED">Đã hủy</option><option value="FAILED">Lỗi</option>
        </Select>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
        ) : paginated.length === 0 ? (
          <EmptyState title="Không có đơn hàng" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-dim border-b border-border bg-bg-soft/30">
                    <th className="font-medium py-3 px-4">ID</th><th className="font-medium py-3 px-4">Người dùng</th><th className="font-medium py-3 px-4">Dịch vụ</th><th className="font-medium py-3 px-4 text-right">SL</th><th className="font-medium py-3 px-4 text-right">Chi phí</th><th className="font-medium py-3 px-4">Trạng thái</th><th className="font-medium py-3 px-4">Ngày tạo</th><th className="font-medium py-3 px-4 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((o, i) => (
                    <motion.tr key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-b border-border/40 hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-mono text-xs text-text-dim">{o.id.slice(0, 8)}</td>
                      <td className="py-3 px-4 text-white font-medium">{o.username}</td>
                      <td className="py-3 px-4"><div className="text-text">{o.service_name}</div><div className="text-xs text-text-dim">{o.category_name}</div></td>
                      <td className="py-3 px-4 text-right text-text-muted">{o.quantity}</td>
                      <td className="py-3 px-4 text-right font-medium text-white">{formatCurrency(o.charge)}</td>
                      <td className="py-3 px-4"><OrderStatusBadge status={o.status} /></td>
                      <td className="py-3 px-4 text-xs text-text-dim whitespace-nowrap">{formatDate(o.created_at)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setDetailOrder(o)} className="h-8 w-8 rounded-lg flex items-center justify-center text-text-muted hover:text-white hover:bg-white/[0.06]" title="Chi tiết"><Eye className="h-4 w-4" /></button>
                          {o.status === 'PENDING' && (<>
                            <button onClick={() => handleStatus(o.id, 'PROCESSING')} disabled={actionLoading === o.id} className="h-8 w-8 rounded-lg flex items-center justify-center text-primary-300 hover:bg-primary-500/10" title="Chạy"><RefreshCw className="h-4 w-4" /></button>
                            <button onClick={() => handleStatus(o.id, 'CANCELED')} disabled={actionLoading === o.id} className="h-8 w-8 rounded-lg flex items-center justify-center text-danger hover:bg-danger/10" title="Hủy + hoàn tiền"><XCircle className="h-4 w-4" /></button>
                          </>)}
                          {o.status === 'PROCESSING' && <button onClick={() => handleStatus(o.id, 'COMPLETED')} disabled={actionLoading === o.id} className="h-8 w-8 rounded-lg flex items-center justify-center text-success hover:bg-success/10" title="Hoàn thành"><CheckCircle2 className="h-4 w-4" /></button>}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination page={page} perPage={PER_PAGE} total={filtered.length} onPageChange={setPage} />
          </>
        )}
      </Card>

      <Modal open={!!detailOrder} onClose={() => setDetailOrder(null)} title="Chi tiết đơn hàng" size="lg">
        {detailOrder && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <DetailItem label="Mã đơn" value={detailOrder.id} />
              <DetailItem label="Người dùng" value={detailOrder.username} />
              <DetailItem label="Dịch vụ" value={detailOrder.service_name} />
              <DetailItem label="Danh mục" value={detailOrder.category_name} />
              <DetailItem label="Link" value={detailOrder.link} />
              <DetailItem label="Số lượng" value={String(detailOrder.quantity)} />
              <DetailItem label="Chi phí" value={formatCurrency(detailOrder.charge)} />
              <DetailItem label="Vốn" value={formatCurrency(detailOrder.cost)} />
              <DetailItem label="Lợi nhuận" value={formatCurrency(detailOrder.profit)} />
              <div><span className="text-xs text-text-dim">Trạng thái</span><div className="mt-1"><OrderStatusBadge status={detailOrder.status} /></div></div>
              <DetailItem label="Start count" value={String(detailOrder.start_count ?? '-')} />
              <DetailItem label="Còn lại" value={String(detailOrder.remains ?? '-')} />
              <DetailItem label="Ngày tạo" value={formatDate(detailOrder.created_at)} />
              {detailOrder.completed_at && <DetailItem label="Hoàn thành" value={formatDate(detailOrder.completed_at)} />}
            </div>
            {['PENDING', 'PROCESSING'].includes(detailOrder.status) && (
              <div className="flex gap-2 pt-3 border-t border-border">
                <Button variant="success" size="sm" leftIcon={<CheckCircle2 className="h-4 w-4" />} loading={actionLoading === detailOrder.id} onClick={() => handleStatus(detailOrder.id, 'COMPLETED')}>Hoàn thành</Button>
                <Button variant="danger" size="sm" leftIcon={<XCircle className="h-4 w-4" />} loading={actionLoading === detailOrder.id} onClick={() => handleStatus(detailOrder.id, 'CANCELED')}>Hủy + hoàn tiền</Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (<div><span className="text-xs text-text-dim">{label}</span><p className="text-sm text-white mt-0.5 break-all">{value}</p></div>);
}
