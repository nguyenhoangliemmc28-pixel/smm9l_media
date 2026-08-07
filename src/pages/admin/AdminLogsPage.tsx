import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ScrollText, Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { TablePagination, EmptyState, PageHeader } from '@/components/ui/Table';
import { useQuery } from '@/lib/useQuery';
import { fetchLogs } from '@/lib/admin';
import { formatDate } from '@/lib/utils';

const PER_PAGE = 20;

const actionTone: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  CREATE: 'success', UPDATE: 'info', DELETE: 'danger', DUPLICATE: 'info',
  ADJUST_BALANCE: 'warning', REJECT: 'danger', APPROVE: 'success',
  UPDATE_STATUS: 'info', REPLY: 'info', BROADCAST: 'warning',
};

export function AdminLogsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: logs, loading } = useQuery(() => fetchLogs(200, 0), []);
  useEffect(() => { setPage(1); }, [search]);

  const filtered = (logs ?? []).filter((l) => !search || l.action.toLowerCase().includes(search.toLowerCase()) || l.entity.toLowerCase().includes(search.toLowerCase()) || (l.admin_name ?? '').toLowerCase().includes(search.toLowerCase()));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="space-y-5">
      <PageHeader title="Nhật ký hệ thống" subtitle={`${filtered.length} bản ghi`} />
      <div className="flex gap-3"><div className="flex-1 max-w-md"><Input placeholder="Tìm theo hành động, admin..." value={search} onChange={(e) => setSearch(e.target.value)} leftIcon={<Search className="h-4 w-4" />} /></div></div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
        ) : paginated.length === 0 ? (
          <EmptyState icon={ScrollText} title="Chưa có log" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-text-dim border-b border-border bg-bg-soft/30"><th className="font-medium py-3 px-4">Admin</th><th className="font-medium py-3 px-4">Hành động</th><th className="font-medium py-3 px-4">Đối tượng</th><th className="font-medium py-3 px-4">ID</th><th className="font-medium py-3 px-4">Chi tiết</th><th className="font-medium py-3 px-4">Thời gian</th></tr></thead>
                <tbody>
                  {paginated.map((l, i) => (
                    <motion.tr key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }} className="border-b border-border/40 hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-white font-medium">{l.admin_name ?? '-'}</td>
                      <td className="py-3 px-4"><Badge tone={actionTone[l.action] ?? 'neutral'} size="sm">{l.action}</Badge></td>
                      <td className="py-3 px-4 text-text-muted">{l.entity}</td>
                      <td className="py-3 px-4 font-mono text-xs text-text-dim">{l.entity_id?.slice(0, 8) ?? '-'}</td>
                      <td className="py-3 px-4 text-text-muted text-xs max-w-[200px] truncate">{l.details ? JSON.stringify(l.details) : '-'}</td>
                      <td className="py-3 px-4 text-xs text-text-dim whitespace-nowrap">{formatDate(l.created_at)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination page={page} perPage={PER_PAGE} total={filtered.length} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
