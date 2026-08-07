import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, ChevronDown, User, KeyRound, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@/lib/useQuery';
import { fetchNotifications, markAllNotificationsRead } from '@/lib/services';
import { formatCurrency, timeAgo, cn } from '@/lib/utils';
import type { INotification } from '@/lib/types';

export function TopNavbar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const { data: notifications, refetch } = useQuery(() => fetchNotifications(), []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = (notifications ?? []).filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    refetch();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const notifTypeColor = (type: string) => {
    if (type === 'ORDER') return 'bg-success';
    if (type === 'PAYMENT') return 'bg-accent';
    if (type === 'TICKET') return 'bg-primary-400';
    return 'bg-blue-400';
  };

  return (
    <header className="sticky top-0 z-30 h-16 px-4 sm:px-6 flex items-center justify-between gap-4 bg-bg-navbar backdrop-blur-xl border-b border-border">
      <div className="flex-1 max-w-md">
        <form onSubmit={(e) => { e.preventDefault(); if (searchQuery.trim()) { navigate('/dashboard/services'); } }} className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm dịch vụ, đơn hàng, ticket..."
            className="w-full h-10 rounded-input bg-bg-soft/60 border border-border pl-10 pr-4 text-sm text-white placeholder:text-text-dim focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/15 transition-all"
          />
        </form>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative h-10 w-10 rounded-lg flex items-center justify-center text-text-muted hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-danger ring-2 ring-bg-navbar" />
            )}
          </button>
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-80 rounded-card glass-strong shadow-card-hover p-2"
              >
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm font-semibold text-white">Thông báo</span>
                  <button onClick={handleMarkAllRead} className="text-[11px] text-primary-300 cursor-pointer hover:underline">
                    Đánh dấu đã đọc
                  </button>
                </div>
                <div className="space-y-0.5 max-h-80 overflow-y-auto no-scrollbar">
                  {(notifications ?? []).length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-text-dim">Chưa có thông báo</div>
                  ) : (
                    (notifications ?? []).slice(0, 6).map((n: INotification) => (
                      <div key={n.id} className="flex gap-2.5 p-2.5 rounded-lg hover:bg-white/[0.03] cursor-pointer">
                        <span className={cn('mt-1.5 h-2 w-2 rounded-full shrink-0', notifTypeColor(n.type))} />
                        <div className="min-w-0">
                          <p className="text-sm text-white leading-snug">{n.title}</p>
                          <p className="text-[11px] text-text-dim mt-0.5">{timeAgo(n.created_at)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <Link to="/dashboard/notifications" className="block px-3 py-2 text-center text-xs text-primary-300 hover:underline">
                  Xem tất cả
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 h-10 pl-1 pr-2 rounded-lg hover:bg-white/[0.04] transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white text-sm font-semibold">
              {profile?.username?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-medium text-white leading-tight">{profile?.username ?? 'User'}</div>
              <div className="text-[11px] text-text-dim leading-tight">{formatCurrency(profile?.balance ?? 0)}</div>
            </div>
            <ChevronDown className="h-4 w-4 text-text-dim hidden sm:block" />
          </button>
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-64 rounded-card glass-strong shadow-card-hover p-2"
              >
                <div className="px-3 py-3 border-b border-border mb-1">
                  <div className="text-sm font-semibold text-white">{profile?.username ?? 'User'}</div>
                  <div className="text-xs text-text-dim">{profile?.email ?? ''}</div>
                </div>
                {[
                  { icon: User, label: 'Thông tin cá nhân', path: '/dashboard/settings' },
                  { icon: KeyRound, label: 'API Key', path: '/dashboard/api' },
                  { icon: Settings, label: 'Cài đặt tài khoản', path: '/dashboard/settings' },
                ].map((item) => (
                  <Link
                    key={item.label}
                    to={item.path}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-muted hover:text-white hover:bg-white/[0.04] transition-colors"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
                <div className="my-1 h-px bg-border" />
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-danger-400 hover:bg-danger/5 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
