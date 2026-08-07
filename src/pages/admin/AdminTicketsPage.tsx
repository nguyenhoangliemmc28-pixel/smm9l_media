import { useState } from 'react';
import { motion } from 'framer-motion';
import { Ticket, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea, Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, PageHeader } from '@/components/ui/Table';
import { useToast } from '@/lib/toast';
import { useQuery } from '@/lib/useQuery';
import { fetchAllTickets, replyTicket, updateTicketStatus, fetchTicketReplies } from '@/lib/admin';
import { formatDate } from '@/lib/utils';
import type { IAdminTicket, ITicketReply } from '@/lib/types';

const statusConfig: Record<string, { tone: 'success' | 'warning' | 'info' | 'neutral'; label: string }> = {
  OPEN: { tone: 'warning', label: 'Mở' }, ANSWERED: { tone: 'success', label: 'Đã trả lời' }, USER_REPLY: { tone: 'info', label: 'User phản hồi' }, CLOSED: { tone: 'neutral', label: 'Đã đóng' },
};
const priorityConfig: Record<string, 'neutral' | 'warning' | 'danger'> = { LOW: 'neutral', MEDIUM: 'warning', HIGH: 'danger' };

export function AdminTicketsPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailTicket, setDetailTicket] = useState<IAdminTicket | null>(null);
  const [replies, setReplies] = useState<ITicketReply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);

  const { data: tickets, loading, refetch } = useQuery(() => fetchAllTickets(200, 0, statusFilter), [statusFilter]);

  const openDetail = async (t: IAdminTicket) => {
    setDetailTicket(t); setLoadingReplies(true);
    const data = await fetchTicketReplies(t.id);
    setReplies(data); setLoadingReplies(false);
  };

  const handleReply = async () => {
    if (!detailTicket || !replyText.trim()) return;
    setReplying(true);
    try {
      await replyTicket(detailTicket.id, replyText);
      toast('Đã gửi phản hồi', 'success');
      setReplyText('');
      const data = await fetchTicketReplies(detailTicket.id);
      setReplies(data);
      refetch();
    }
    catch (e: any) { toast(e.message ?? 'Lỗi', 'error'); }
    finally { setReplying(false); }
  };

  const handleClose = async (id: string) => { try { await updateTicketStatus(id, 'CLOSED'); toast('Đã đóng ticket', 'success'); refetch(); setDetailTicket(null); } catch (e: any) { toast(e.message ?? 'Lỗi', 'error'); } };

  return (
    <div className="space-y-5">
      <PageHeader title="Quản lý ticket" subtitle={`${tickets?.length ?? 0} ticket`} />
      <div className="flex gap-3"><Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} containerClassName="w-40"><option value="all">Tất cả</option><option value="OPEN">Mở</option><option value="ANSWERED">Đã trả lời</option><option value="USER_REPLY">User phản hồi</option><option value="CLOSED">Đã đóng</option></Select></div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
        ) : (tickets ?? []).length === 0 ? (
          <EmptyState icon={Ticket} title="Chưa có ticket" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-text-dim border-b border-border bg-bg-soft/30"><th className="font-medium py-3 px-4">Chủ đề</th><th className="font-medium py-3 px-4">User</th><th className="font-medium py-3 px-4">Phòng ban</th><th className="font-medium py-3 px-4">Ưu tiên</th><th className="font-medium py-3 px-4">Trạng thái</th><th className="font-medium py-3 px-4">Cập nhật</th><th className="font-medium py-3 px-4 text-right">Hành động</th></tr></thead>
              <tbody>
                {(tickets ?? []).map((t, i) => (
                  <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }} className="border-b border-border/40 hover:bg-white/[0.02]">
                    <td className="py-3 px-4 text-white font-medium">{t.subject}</td>
                    <td className="py-3 px-4 text-text-muted">{t.username}</td>
                    <td className="py-3 px-4 text-text-muted">{t.department}</td>
                    <td className="py-3 px-4"><Badge tone={priorityConfig[t.priority] ?? 'neutral'} size="sm">{t.priority}</Badge></td>
                    <td className="py-3 px-4"><Badge tone={statusConfig[t.status]?.tone ?? 'neutral'} size="sm" dot>{statusConfig[t.status]?.label ?? t.status}</Badge></td>
                    <td className="py-3 px-4 text-xs text-text-dim whitespace-nowrap">{formatDate(t.updated_at)}</td>
                    <td className="py-3 px-4 text-right"><Button variant="ghost" size="sm" leftIcon={<MessageSquare className="h-3.5 w-3.5" />} onClick={() => openDetail(t)}>Xem</Button></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!detailTicket} onClose={() => setDetailTicket(null)} title="Chi tiết ticket" size="lg">
        {detailTicket && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-bg-soft/40 border border-border">
              <div className="flex items-center justify-between mb-2"><h4 className="text-sm font-semibold text-white">{detailTicket.subject}</h4><Badge tone={statusConfig[detailTicket.status]?.tone ?? 'neutral'} size="sm">{statusConfig[detailTicket.status]?.label}</Badge></div>
              <div className="flex gap-4 text-xs text-text-dim"><span>User: {detailTicket.username}</span><span>Phòng: {detailTicket.department}</span><span>Ưu tiên: {detailTicket.priority}</span></div>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {loadingReplies ? <div className="text-center py-8 text-text-muted text-sm">Đang tải...</div> : replies.length === 0 ? <div className="text-center py-8 text-text-muted text-sm">Chưa có tin nhắn</div> : replies.map((r) => (
                <div key={r.id} className={`flex ${r.admin_id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-xl p-3 ${r.admin_id ? 'bg-primary-500/15 border border-primary-500/30' : 'bg-bg-soft/60 border border-border'}`}><p className="text-sm text-white">{r.message}</p><p className="text-xs text-text-dim mt-1">{formatDate(r.created_at)}</p></div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-3 border-t border-border"><Textarea containerClassName="flex-1" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Nhập phản hồi..." /></div>
            <div className="flex justify-between gap-3"><Button variant="danger" size="sm" leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => handleClose(detailTicket.id)}>Đóng ticket</Button><Button loading={replying} leftIcon={<Send className="h-4 w-4" />} onClick={handleReply}>Gửi phản hồi</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
