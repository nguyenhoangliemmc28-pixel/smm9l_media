import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, PlusCircle, Boxes, ListOrdered, Loader, CheckCircle2,
  AlertTriangle, Wallet, Receipt, Landmark, Gift, Code2, Ticket, Bell,
  Settings, LogOut, ShieldCheck, ChevronLeft, Zap, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { formatCurrency, cn } from '@/lib/utils';

interface NavItem { label: string; icon: LucideIcon; path: string; badge?: string; adminOnly?: boolean; }
const navGroups: { title?: string; items: NavItem[] }[] = [
  { items: [{ label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' }] },
  { items: [
    { label: 'Tạo đơn hàng', icon: PlusCircle, path: '/dashboard/new-order' },
    { label: 'Dịch vụ', icon: Boxes, path: '/dashboard/services' },
  ] },
  { title: 'Đơn hàng', items: [
    { label: 'Tất cả đơn', icon: ListOrdered, path: '/dashboard/orders' },
    { label: 'Đang chạy', icon: Loader, path: '/dashboard/orders/running' },
    { label: 'Hoàn thành', icon: CheckCircle2, path: '/dashboard/orders/completed' },
    { label: 'Đơn lỗi', icon: AlertTriangle, path: '/dashboard/orders/failed' },
  ] },
  { title: 'Tài chính', items: [
    { label: 'Nạp tiền', icon: Wallet, path: '/dashboard/deposit' },
    { label: 'Lịch sử giao dịch', icon: Receipt, path: '/dashboard/transactions' },
    { label: 'Ví của tôi', icon: Landmark, path: '/dashboard/wallet' },
    { label: 'Affiliate', icon: Gift, path: '/dashboard/affiliate' },
  ] },
  { title: 'Khác', items: [
    { label: 'API', icon: Code2, path: '/dashboard/api' },
    { label: 'Ticket hỗ trợ', icon: Ticket, path: '/dashboard/tickets' },
    { label: 'Thông báo', icon: Bell, path: '/dashboard/notifications' },
    { label: 'Cài đặt', icon: Settings, path: '/dashboard/settings' },
    { label: 'Admin', icon: ShieldCheck, path: '/dashboard/admin', adminOnly: true },
  ] },
];

interface SidebarProps { collapsed: boolean; setCollapsed: (v: boolean) => void; }
export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const isAdmin = profile?.role === 'SUPER_ADMIN' || profile?.role === 'ADMIN';

  return (
    <aside className={cn('fixed inset-y-0 left-0 z-40 flex flex-col bg-bg-sidebar border-r border-border transition-all duration-300', collapsed ? 'w-[76px]' : 'w-[256px]')}>
      <div className={cn('flex items-center h-16 px-4 border-b border-border', collapsed && 'justify-center')}>
        <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-glow shrink-0">
            <Zap className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
          {!collapsed && <span className="text-lg font-bold tracking-tight">Boost<span className="text-gradient-primary">Hub</span></span>}
        </button>
      </div>
      <button onClick={() => setCollapsed(!collapsed)} className="absolute -right-3 top-20 h-6 w-6 rounded-full glass-strong flex items-center justify-center text-text-muted hover:text-white">
        <motion.span animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.2 }}><ChevronLeft className="h-3.5 w-3.5" /></motion.span>
      </button>
      <nav className="flex-1 overflow-y-auto no-scrollbar py-4 px-3 space-y-5">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.title && !collapsed && <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-dim">{group.title}</p>}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                if (item.adminOnly && !isAdmin) return null;
                return (
                  <NavLink key={item.path} to={item.path} className={({ isActive }) => cn('relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all', isActive ? 'text-white' : 'text-text-muted hover:text-white hover:bg-white/[0.04]', collapsed && 'justify-center')}>
                    {({ isActive }) => (
                      <>
                        {isActive && <motion.div layoutId="sidebar-active" className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500/20 to-secondary-500/10 border border-primary-500/30 shadow-glow" transition={{ duration: 0.2 }} />}
                        <item.icon className={cn('relative h-[18px] w-[18px] shrink-0', isActive && 'text-primary-300')} strokeWidth={1.8} />
                        {!collapsed && <span className="relative flex-1 font-medium">{item.label}</span>}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-border space-y-2">
        {!collapsed && profile && (
          <div className="rounded-btn bg-bg-card border border-border p-3">
            <p className="text-xs text-text-dim mb-1">Số dư ví</p>
            <p className="text-base font-bold text-white">{formatCurrency(Number(profile.balance))}</p>
          </div>
        )}
        <button onClick={async () => { await signOut(); navigate('/'); }} className={cn('w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-muted hover:text-danger-400 hover:bg-danger/5 transition-colors', collapsed && 'justify-center')}>
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} />
          {!collapsed && <span className="font-medium">Đăng xuất</span>}
        </button>
      </div>
    </aside>
  );
}
