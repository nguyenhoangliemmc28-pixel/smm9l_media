import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Send, Paperclip, Clock, CheckCircle2, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/lib/toast';
import { fetchTickets, createTicket, fetchTicketReplies, sendTicketReply } from '@/lib/services';
import { formatDate, cn } from '@/lib/utils';
import type { ITicket, ITicketReply } from '@/lib/types';

const priorityConfig = {
  LOW: { label: 'Thấp', tone: 'neutral' as const },
  MEDIUM: { label: 'Trung bình', tone: 'primary' as const },
  HIGH: { label: 'Cao', tone: 'warning' as const },
  URGENT: { label: 'Khẩn cấp', tone: 'danger' as const },
};

const statusConfig = {
  OPEN: { label: 'Đang mở', tone: 'warning' as const },
  ANSWERED: { label: 'Đã trả lời', tone: 'success' as const },
  USER_REPLY: { label: 'Bạn đã trả lời', tone: 'primary' as const },
  CLOSED: { label: 'Đã đóng', tone: 'neutral' as const },
};

export function TicketsPage() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<ITicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [replies, setReplies] = useState<ITicketReply[]>([]);
  const [reply, setReply] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newDept, setNewDept] = useState('Kỹ thuật');
  const [newMsg, setNewMsg] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await fetchTickets();
      setTickets(data);
      if (data.length > 0) setActiveId(data[0].id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!activeId) return;
    (async () => {
      const data = await fetchTicketReplies(activeId);
      setReplies(data);
    })();
  }, [activeId]);

  const active = tickets.find((t) => t.id === activeId);

  const handleSendReply = async () => {
    if (!reply.trim() || !activeId) return;
    await sendTicketReply(activeId, reply);
    setReply('');
    const data = await fetchTicketReplies(activeId);
    setReplies(data);
    const updated = await fetchTickets();
    setTickets(updated);
  };

  const handleCreate = async () => {
    if (!newSubject || !newMsg) {
      toast('Vui lòng điền đầy đủ', 'error');
      return;
    }
    setCreating(true);
    const result = await createTicket(newSubject, newDept, newMsg);
    setCreating(false);
    if (result.success) {
      toast('Ticket đã được tạo', 'success');
      setShowNew(false);
      setNewSubject('');
      setNewMsg('');
      const data = await fetchTickets();
      setTickets(data);
      if (data.length > 0) setActiveId(data[0].id);
    } else {
      toast(result.message ?? 'Tạo ticket thất bại', 'error');
    }
  };

  if (loading) {
    return <div className="space-y-5"><div className="skeleton h-8 w-48 rounded" /><div className="skeleton h-96 rounded-card" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ticket hỗ trợ</h1>
          <p className="text-sm text-text-muted mt-1">{tickets.length} ticket</p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4" /> Tạo ticket
        </Button>
      </div>

      {tickets.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-text-muted">Chưa có ticket nào. <button onClick={() => setShowNew(true)} className="text-primary-300 hover:underline">Tạo ticket mới</button></p>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
          <Card className="overflow-y-auto no-scrollbar">
            {tickets.map((t) => {
              const st = statusConfig[t.status as keyof typeof statusConfig] ?? statusConfig.OPEN;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  className={cn('w-full text-left p-4 border-b border-border/40 transition-colors', activeId === t.id ? 'bg-primary-500/10' : 'hover:bg-white/[0.02]')}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono text-primary-300">#{t.id.slice(0, 6)}</span>
                    <Badge tone={st.tone} size="sm">{st.label}</Badge>
                  </div>
                  <div className="text-sm font-medium text-white leading-snug line-clamp-2">{t.subject}</div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-text-dim">
                    <span>{t.department}</span><span>·</span><span>{formatDate(t.updated_at)}</span>
                  </div>
                </button>
              );
            })}
          </Card>

          <Card className="lg:col-span-2 flex flex-col">
            {active && (
              <>
                <div className="p-5 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-white">{active.subject}</h3>
                    <Badge tone={priorityConfig[active.priority as keyof typeof priorityConfig]?.tone ?? 'neutral'} size="sm">
                      {priorityConfig[active.priority as keyof typeof priorityConfig]?.label ?? active.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-dim mt-1">#{active.id.slice(0, 8)} · {active.department}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {replies.map((m, i) => (
                    <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={cn('flex gap-3', m.user_id && 'flex-row-reverse')}>
                      <div className={cn('h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold', m.user_id ? 'bg-gradient-to-br from-primary-500 to-secondary-500 text-white' : 'bg-white/10 text-text-muted')}>
                        {m.user_id ? 'M' : 'S'}
                      </div>
                      <div className={cn('max-w-[75%] rounded-2xl px-4 py-2.5', m.user_id ? 'bg-primary-500/15 border border-primary-500/30' : 'glass')}>
                        <p className="text-sm text-white leading-relaxed">{m.message}</p>
                        <p className="text-[10px] text-text-dim mt-1">{formatDate(m.created_at)}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="p-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                      placeholder="Nhập tin nhắn..."
                      className="flex-1 h-10 rounded-input bg-bg-soft/60 border border-border px-3.5 text-sm text-white placeholder:text-text-dim focus:outline-none focus:border-primary-500/60"
                    />
                    <Button size="icon" onClick={handleSendReply}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      <AnimatePresence>
        {showNew && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowNew(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="w-full max-w-md rounded-modal glass-strong shadow-card-hover p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-4">Tạo ticket mới</h3>
              <div className="space-y-4">
                <Input label="Tiêu đề" placeholder="Mô tả ngắn vấn đề" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} />
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Phòng ban</label>
                  <select value={newDept} onChange={(e) => setNewDept(e.target.value)} className="w-full h-11 rounded-input bg-bg-soft/80 border border-border px-3.5 text-sm text-white focus:outline-none focus:border-primary-500/60">
                    <option>Kỹ thuật</option><option>Kinh doanh</option><option>Kế toán</option><option>Khác</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Mô tả chi tiết</label>
                  <textarea rows={4} placeholder="Mô tả vấn đề của bạn..." value={newMsg} onChange={(e) => setNewMsg(e.target.value)} className="w-full rounded-input bg-bg-soft/80 border border-border p-3.5 text-sm text-white placeholder:text-text-dim focus:outline-none focus:border-primary-500/60 resize-none" />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" fullWidth onClick={() => setShowNew(false)}>Hủy</Button>
                  <Button fullWidth loading={creating} onClick={handleCreate}>Gửi ticket</Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
