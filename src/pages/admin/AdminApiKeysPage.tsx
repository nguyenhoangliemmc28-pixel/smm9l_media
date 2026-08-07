import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Key, Search, Ban, CheckCircle2, Copy } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TablePagination, EmptyState, PageHeader } from '@/components/ui/Table';
import { useToast } from '@/lib/toast';
import { useQuery } from '@/lib/useQuery';
import { fetchAllApiKeys, revokeApiKey, type IAdminApiKey } from '@/lib/admin';
import { formatDate } from '@/lib/utils';

const PER_PAGE = 10;

const statusConfig: Record<string, { tone: 'success' | 'danger'; label: string }> = {
  ACTIVE: { tone: 'success', label: 'Active' },
  REVOKED: { tone: 'danger', label: 'Revoked' },
};

export function AdminApiKeysPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [revokeTarget, setRevokeTarget] = useState<IAdminApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  const { data: apiKeys, loading, refetch } = useQuery(() => fetchAllApiKeys(200, 0), []);

  const filtered = useMemo(() => {
    return (apiKeys ?? []).filter((k) => {
      const matchSearch = !search || k.username.toLowerCase().includes(search.toLowerCase()) || k.email.toLowerCase().includes(search.toLowerCase()) || k.key.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || k.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter, apiKeys]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const activeCount = (apiKeys ?? []).filter((k) => k.status === 'ACTIVE').length;
  const revokedCount = (apiKeys ?? []).filter((k) => k.status === 'REVOKED').length;

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await revokeApiKey(revokeTarget.id);
      toast('Đã thu hồi API key', 'success');
      setRevokeTarget(null);
      refetch();
    } catch (e: any) {
      toast(e.message ?? 'Lỗi', 'error');
    } finally {
      setRevoking(false);
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast('Đã sao chép API key', 'info');
  };

  const maskKey = (key: string) => {
    if (key.length <= 12) return key;
    return key.slice(0, 8) + '••••••••' + key.slice(-4);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="API Keys" subtitle={`${activeCount} active, ${revokedCount} revoked`} />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 max-w-md">
          <Input placeholder="Tìm theo user, email hoặc key..." value={search} onChange={(e) => setSearch(e.target.value)} leftIcon={<Search className="h-4 w-4" />} />
        </div>
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} containerClassName="w-40">
          <option value="all">Tất cả trạng thái</option>
          <option value="ACTIVE">Active</option>
          <option value="REVOKED">Revoked</option>
        </Select>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
        ) : paginated.length === 0 ? (
          <EmptyState icon={Key} title="Chưa có API key nào" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-dim border-b border-border bg-bg-soft/30">
                  <th className="font-medium py-3 px-4">User</th>
                  <th className="font-medium py-3 px-4">API Key</th>
                  <th className="font-medium py-3 px-4">Trạng thái</th>
                  <th className="font-medium py-3 px-4">Lần dùng cuối</th>
                  <th className="font-medium py-3 px-4">Ngày tạo</th>
                  <th className="font-medium py-3 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((k, i) => (
                  <motion.tr key={k.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }} className="border-b border-border/40 hover:bg-white/[0.02]">
                    <td className="py-3 px-4">
                      <div className="text-white font-medium">{k.username}</div>
                      <div className="text-xs text-text-dim">{k.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono text-primary-300">{maskKey(k.key)}</code>
                        <button onClick={() => copyKey(k.key)} className="text-text-dim hover:text-white" title="Sao chép">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4"><Badge tone={statusConfig[k.status]?.tone ?? 'neutral'} size="sm" dot>{statusConfig[k.status]?.label ?? k.status}</Badge></td>
                    <td className="py-3 px-4 text-xs text-text-dim whitespace-nowrap">{k.last_used_at ? formatDate(k.last_used_at) : 'Chưa sử dụng'}</td>
                    <td className="py-3 px-4 text-xs text-text-dim whitespace-nowrap">{formatDate(k.created_at)}</td>
                    <td className="py-3 px-4 text-right">
                      {k.status === 'ACTIVE' ? (
                        <Button variant="danger" size="sm" leftIcon={<Ban className="h-3.5 w-3.5" />} onClick={() => setRevokeTarget(k)}>Thu hồi</Button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-text-dim"><CheckCircle2 className="h-3.5 w-3.5" /> Đã thu hồi</span>
                      )}
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

      <Modal open={!!revokeTarget} onClose={() => setRevokeTarget(null)} title="Thu hồi API Key" size="sm">
        {revokeTarget && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">Bạn có chắc muốn thu hồi API key của <strong className="text-white">{revokeTarget.username}</strong>? Người dùng sẽ không thể gọi API với key này nữa.</p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setRevokeTarget(null)}>Hủy</Button>
              <Button variant="danger" loading={revoking} onClick={handleRevoke}>Thu hồi</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
