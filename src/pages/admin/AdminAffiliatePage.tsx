import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users2, Search, Pencil, Save } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TablePagination, EmptyState, PageHeader } from '@/components/ui/Table';
import { useToast } from '@/lib/toast';
import { useQuery } from '@/lib/useQuery';
import { fetchAffiliates, updateAffiliateCommission, type IAdminAffiliate } from '@/lib/admin';
import { formatCurrency, formatDate } from '@/lib/utils';

const PER_PAGE = 10;

export function AdminAffiliatePage() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editTarget, setEditTarget] = useState<IAdminAffiliate | null>(null);
  const [editCommission, setEditCommission] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: affiliates, loading, refetch } = useQuery(() => fetchAffiliates(200, 0), []);

  const filtered = useMemo(() => {
    return (affiliates ?? []).filter((a) => {
      const matchSearch = !search || a.username.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase()) || a.code.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [search, affiliates]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const totalClicks = (affiliates ?? []).reduce((sum, a) => sum + a.clicks, 0);
  const totalConversions = (affiliates ?? []).reduce((sum, a) => sum + a.conversions, 0);
  const totalCommission = (affiliates ?? []).reduce((sum, a) => sum + Number(a.commission), 0);

  const openEdit = (a: IAdminAffiliate) => {
    setEditTarget(a);
    setEditCommission(String(a.commission));
  };

  const handleSave = async () => {
    if (!editTarget) return;
    const commission = parseFloat(editCommission);
    if (isNaN(commission) || commission < 0 || commission > 100) {
      toast('Hoa hồng phải từ 0-100%', 'error');
      return;
    }
    setSaving(true);
    try {
      await updateAffiliateCommission(editTarget.id, commission);
      toast('Đã cập nhật hoa hồng', 'success');
      setEditTarget(null);
      refetch();
    } catch (e: any) {
      toast(e.message ?? 'Lỗi', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Affiliate" subtitle={`${filtered.length} đối tác tiếp thị`} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-xs text-text-dim uppercase tracking-wider">Tổng lượt click</p>
          <p className="text-2xl font-bold text-white mt-2">{totalClicks.toLocaleString()}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-text-dim uppercase tracking-wider">Tổng chuyển đổi</p>
          <p className="text-2xl font-bold text-white mt-2">{totalConversions.toLocaleString()}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-text-dim uppercase tracking-wider">Tổng hoa hồng</p>
          <p className="text-2xl font-bold text-white mt-2">{formatCurrency(totalCommission)}</p>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 max-w-md">
          <Input placeholder="Tìm theo user, email hoặc mã..." value={search} onChange={(e) => setSearch(e.target.value)} leftIcon={<Search className="h-4 w-4" />} />
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
        ) : paginated.length === 0 ? (
          <EmptyState icon={Users2} title="Chưa có đối tác affiliate" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-dim border-b border-border bg-bg-soft/30">
                  <th className="font-medium py-3 px-4">User</th>
                  <th className="font-medium py-3 px-4">Mã affiliate</th>
                  <th className="font-medium py-3 px-4 text-right">Clicks</th>
                  <th className="font-medium py-3 px-4 text-right">Chuyển đổi</th>
                  <th className="font-medium py-3 px-4 text-right">Hoa hồng</th>
                  <th className="font-medium py-3 px-4 text-right">Referrals</th>
                  <th className="font-medium py-3 px-4">Ngày tham gia</th>
                  <th className="font-medium py-3 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((a, i) => (
                  <motion.tr key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }} className="border-b border-border/40 hover:bg-white/[0.02]">
                    <td className="py-3 px-4">
                      <div className="text-white font-medium">{a.username}</div>
                      <div className="text-xs text-text-dim">{a.email}</div>
                    </td>
                    <td className="py-3 px-4"><code className="text-sm font-mono text-primary-300">{a.code}</code></td>
                    <td className="py-3 px-4 text-right text-text-muted">{a.clicks.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-text-muted">{a.conversions.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right"><Badge tone="accent" size="sm">{Number(a.commission)}%</Badge></td>
                    <td className="py-3 px-4 text-right text-text-muted">{a.referral_count}</td>
                    <td className="py-3 px-4 text-xs text-text-dim whitespace-nowrap">{formatDate(a.created_at)}</td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="ghost" size="sm" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => openEdit(a)}>Sửa</Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <TablePagination page={page} perPage={PER_PAGE} total={filtered.length} onPageChange={setPage} />
        )}
      </Card>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Chỉnh sửa hoa hồng" size="sm">
        {editTarget && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-bg-soft/40 border border-border">
              <div className="text-sm text-white font-medium">{editTarget.username}</div>
              <div className="text-xs text-text-dim">Mã: {editTarget.code}</div>
            </div>
            <Input label="Hoa hồng (%)" type="number" step="0.1" min="0" max="100" value={editCommission} onChange={(e) => setEditCommission(e.target.value)} />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setEditTarget(null)}>Hủy</Button>
              <Button loading={saving} leftIcon={<Save className="h-4 w-4" />} onClick={handleSave}>Lưu</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
