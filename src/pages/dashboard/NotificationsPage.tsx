import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, DollarSign, MessageSquare, Info, Bell, CheckCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useQuery } from '@/lib/useQuery';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/services';
import { timeAgo, cn } from '@/lib/utils';
import type { INotification } from '@/lib/types';

const typeConfig = {
  ORDER: { icon: CheckCircle2, color: 'text-success-400', bg: 'bg-success/15', border: 'border-success/30' },
  PAYMENT: { icon: DollarSign, color: 'text-accent', bg: 'bg-accent/15', border: 'border-accent/30' },
  TICKET: { icon: MessageSquare, color: 'text-primary-300', bg: 'bg-primary-500/15', border: 'border-primary-500/30' },
  INFO: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30' },
  SUCCESS: { icon: CheckCircle2, color: 'text-success-400', bg: 'bg-success/15', border: 'border-success/30' },
  WARNING: { icon: XCircle, color: 'text-warning-400', bg: 'bg-warning/15', border: 'border-warning/30' },
  ERROR: { icon: XCircle, color: 'text-danger-400', bg: 'bg-danger/15', border: 'border-danger/30' },
};

export function NotificationsPage() {
  const { data: notifs, refetch, loading } = useQuery(() => fetchNotifications(), []);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered = filter === 'all' ? (notifs ?? []) : (notifs ?? []).filter((n) => !n.read);
  const unreadCount = (notifs ?? []).filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    refetch();
  };

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    refetch();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Thông báo</h1>
          <p className="text-sm text-text-muted mt-1">{unreadCount} thông báo chưa đọc</p>
        </div>
        <Button variant="secondary" size="md" onClick={handleMarkAllRead}>
          <CheckCheck className="h-4 w-4" /> Đánh dấu đã đọc
        </Button>
      </div>

      <div className="flex gap-1.5">
        {[
          { key: 'all' as const, label: 'Tất cả' },
          { key: 'unread' as const, label: `Chưa đọc${unreadCount ? ` (${unreadCount})` : ''}` },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-3.5 py-2 rounded-lg text-sm font-medium transition-colors',
              filter === f.key ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30' : 'glass text-text-muted hover:text-white',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-card" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Bell className="h-10 w-10 text-text-dim mx-auto mb-3" />
          <p className="text-text-muted">Không có thông báo</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((n: INotification, i) => {
            const tc = typeConfig[n.type as keyof typeof typeConfig] ?? typeConfig.INFO;
            return (
              <motion.div key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card hover onClick={() => handleMarkRead(n.id)} className={cn('p-4 cursor-pointer', !n.read && 'gradient-border')}>
                  <div className="flex gap-3.5">
                    <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border', tc.bg, tc.border)}>
                      <tc.icon className={cn('h-5 w-5', tc.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">{n.title}</h3>
                        {!n.read && <span className="h-2 w-2 rounded-full bg-primary-400 shrink-0" />}
                      </div>
                      <p className="text-sm text-text-muted mt-0.5">{n.content}</p>
                      <p className="text-xs text-text-dim mt-1.5">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
