import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, ListOrdered, Boxes, FolderTree, Server, Wallet,
  Landmark, Ticket, Megaphone, TicketPercent, Settings, ScrollText, LogOut, ChevronLeft, Zap,
  ArrowDownToLine, Users2, Key, BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface NavItem { label: string; icon: LucideIcon; path: string; }
const navGroups: { title?: string; items: NavItem[] }[] = [
  { items: [{ label: 'Dashboard', icon: LayoutDashboard, path: '/admin' }] },
  { title: 'Quản lý', items: [
    { label: 'Orders', icon: ListOrdered, path: '/admin/orders' },
    { label: 'Services', icon: Boxes, path: '/admin/services' },
    { label: 'Categories', icon: FolderTree, path: '/admin/categories' },
    { label: 'Providers', icon: Server, path: '/admin/providers' },
    { label: 'Users', icon: Users, path: '/admin/users' },
  ] },
  { title: 'Tài chính', items: [
    { label: 'Wallet', icon: Wallet, path: '/admin/wallet' },
    { label: 'Deposits', icon: Landmark, path: '/admin/deposits' },
    { label: 'Withdrawals', icon: ArrowDownToLine, path: '/admin/withdrawals' },
  ] },
  { title: 'Hỗ trợ', items: [
    { label: 'Tickets', icon: Ticket, path: '/admin/tickets' },
    { label: 'Announcements', icon: Megaphone, path: '/admin/announcements' },
  ] },
  { title: 'Hệ thống', items: [
    { label: 'Coupons', icon: TicketPercent, path: '/admin/coupons' },
    { label: 'Affiliate', icon: Users2, path: '/admin/affiliate' },
    { label: 'API Keys', icon: Key, path: '/admin/api-keys' },
    { label: 'Statistics', icon: BarChart3, path: '/admin/statistics' },
    { label: 'Settings', icon: Settings, path: '/admin/settings' },
    { label: 'Logs', icon: ScrollText, path: '/admin/logs' },
  ] },
];

interface Props { collapsed: boolean; setCollapsed: (v: boolean) => void; }
export function AdminSidebar({ collapsed, setCollapsed }: Props) {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => { await signOut(); navigate('/'); };

  return (
    <aside className={cn('fixed inset-y-0 left-0 z-40 flex flex-col bg-bg-sidebar border-r border-border transition-all duration-300', collapsed ? 'w-[76px]' : 'w-[256px]')}>
      <div className={cn('flex items-center h-16 px-4 border-b border-border', collapsed && 'justify-center')}>
        <button onClick={() => navigate('/admin')} className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-glow shrink-0"><Zap className="h-5 w-5 text-white" strokeWidth={2} /></div>
          {!collapsed && <span className="text-lg font-bold tracking-tight">Admin</span>}
        </button>
      </div>
      <button onClick={() => setCollapsed(!collapsed)} className="absolute -right-3 top-20 h-6 w-6 rounded-full glass-strong flex items-center justify-center text-text-muted hover:text-white">
        <motion.span animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.2 }}><ChevronLeft className="h-3.5 w-3.5" /></motion.span>
      </button>
      <nav className="flex-1 overflow-y-auto no-scrollbar py-4 px-3 space-y-4">
        {navGroups.map((g, gi) => (
          <div key={gi}>
            {g.title && !collapsed && <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-dim">{g.title}</p>}
            <div className="space-y-0.5">
              {g.items.map((item) => (
                <NavLink key={item.path} to={item.path} className={({ isActive }) => cn('relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all', isActive ? 'text-white' : 'text-text-muted hover:text-white hover:bg-white/[0.04]', collapsed && 'justify-center')}>
                  {({ isActive }) => (
                    <>
                      {isActive && <motion.div layoutId="admin-sidebar-active" className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500/20 to-secondary-500/10 border border-primary-500/30 shadow-glow" transition={{ duration: 0.2 }} />}
                      <item.icon className={cn('relative h-[18px] w-[18px] shrink-0', isActive && 'text-primary-300')} strokeWidth={1.8} />
                      {!collapsed && <span className="relative flex-1 font-medium">{item.label}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-border">
        <button onClick={handleLogout} className={cn('w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-muted hover:text-danger hover:bg-danger/10 transition-colors', collapsed && 'justify-center')}>
          <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
          {!collapsed && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
