import { lazy, Suspense, Component, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AdminRoute, ProtectedRoute } from '@/components/auth/ProtectedRoute';

const LandingPage = lazy(() => import('@/pages/LandingPage').then(m => ({ default: m.LandingPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const DashboardLayout = lazy(() => import('@/components/dashboard/DashboardLayout').then(m => ({ default: m.DashboardLayout })));
const AdminLayout = lazy(() => import('@/components/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));

const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));
const DashboardHome = lazy(() => import('@/pages/dashboard/DashboardHome').then(m => ({ default: m.DashboardHome })));
const ServicesPage = lazy(() => import('@/pages/dashboard/ServicesPage').then(m => ({ default: m.ServicesPage })));
const NewOrderPage = lazy(() => import('@/pages/dashboard/NewOrderPage').then(m => ({ default: m.NewOrderPage })));
const OrdersPage = lazy(() => import('@/pages/dashboard/OrdersPage').then(m => ({ default: m.OrdersPage })));
const WalletPage = lazy(() => import('@/pages/dashboard/WalletPage').then(m => ({ default: m.WalletPage })));
const DepositPage = lazy(() => import('@/pages/dashboard/DepositPage').then(m => ({ default: m.DepositPage })));
const ApiPage = lazy(() => import('@/pages/dashboard/ApiPage').then(m => ({ default: m.ApiPage })));
const AffiliatePage = lazy(() => import('@/pages/dashboard/AffiliatePage').then(m => ({ default: m.AffiliatePage })));
const TicketsPage = lazy(() => import('@/pages/dashboard/TicketsPage').then(m => ({ default: m.TicketsPage })));
const NotificationsPage = lazy(() => import('@/pages/dashboard/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const SettingsPage = lazy(() => import('@/pages/dashboard/SettingsPage').then(m => ({ default: m.SettingsPage })));
const ModuleHubPage = lazy(() => import('@/pages/ModuleHubPage').then(m => ({ default: m.ModuleHubPage })));
const ModuleDetailPage = lazy(() => import('@/pages/ModuleDetailPage').then(m => ({ default: m.ModuleDetailPage })));

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })));
const AdminOrdersPage = lazy(() => import('@/pages/admin/AdminOrdersPage').then(m => ({ default: m.AdminOrdersPage })));
const AdminServicesPage = lazy(() => import('@/pages/admin/AdminServicesPage').then(m => ({ default: m.AdminServicesPage })));
const AdminCategoriesPage = lazy(() => import('@/pages/admin/AdminCategoriesPage').then(m => ({ default: m.AdminCategoriesPage })));
const AdminProvidersPage = lazy(() => import('@/pages/admin/AdminProvidersPage').then(m => ({ default: m.AdminProvidersPage })));
const AdminWalletPage = lazy(() => import('@/pages/admin/AdminWalletPage').then(m => ({ default: m.AdminWalletPage })));
const AdminDepositsPage = lazy(() => import('@/pages/admin/AdminDepositsPage').then(m => ({ default: m.AdminDepositsPage })));
const AdminTicketsPage = lazy(() => import('@/pages/admin/AdminTicketsPage').then(m => ({ default: m.AdminTicketsPage })));
const AdminAnnouncementsPage = lazy(() => import('@/pages/admin/AdminAnnouncementsPage').then(m => ({ default: m.AdminAnnouncementsPage })));
const AdminCouponsPage = lazy(() => import('@/pages/admin/AdminCouponsPage').then(m => ({ default: m.AdminCouponsPage })));
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage').then(m => ({ default: m.AdminSettingsPage })));
const AdminLogsPage = lazy(() => import('@/pages/admin/AdminLogsPage').then(m => ({ default: m.AdminLogsPage })));
const AdminWithdrawalsPage = lazy(() => import('@/pages/admin/AdminWithdrawalsPage').then(m => ({ default: m.AdminWithdrawalsPage })));
const AdminAffiliatePage = lazy(() => import('@/pages/admin/AdminAffiliatePage').then(m => ({ default: m.AdminAffiliatePage })));
const AdminApiKeysPage = lazy(() => import('@/pages/admin/AdminApiKeysPage').then(m => ({ default: m.AdminApiKeysPage })));
const AdminStatisticsPage = lazy(() => import('@/pages/admin/AdminStatisticsPage').then(m => ({ default: m.AdminStatisticsPage })));
const AdminCatalogPage = lazy(() => import('@/pages/admin/AdminCatalogPage').then(m => ({ default: m.AdminCatalogPage })));

function PageLoader() {
  return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#07070a', color: '#fff', fontFamily: 'system-ui' }}>Đang tải 9L Media...</div>;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', background: '#07070a', color: '#fff', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'system-ui' }}>
          <div style={{ maxWidth: 720, width: '100%', background: '#111118', border: '1px solid #333', borderRadius: 16, padding: 24 }}>
            <h1 style={{ marginTop: 0 }}>9L Media gặp lỗi khi khởi động</h1>
            <p style={{ color: '#aaa' }}>Ứng dụng đã gặp lỗi JavaScript thay vì hiển thị màn hình trắng/đen.</p>
            <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: '#ff9b9b' }}>{this.state.error.message}</pre>
            <button onClick={() => window.location.reload()} style={{ padding: '10px 16px', borderRadius: 8, border: 0, cursor: 'pointer' }}>Tải lại trang</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AdminRoutes() { return <AdminRoute><AdminLayout /></AdminRoute>; }

function AdminContent() {
  return <>
    <Route index element={<AdminDashboard />} /><Route path="orders" element={<AdminOrdersPage />} /><Route path="services" element={<AdminServicesPage />} />
    <Route path="categories" element={<AdminCategoriesPage />} /><Route path="catalog" element={<AdminCatalogPage />} /><Route path="providers" element={<AdminProvidersPage />} />
    <Route path="users" element={<AdminUsersPage />} /><Route path="wallet" element={<AdminWalletPage />} /><Route path="deposits" element={<AdminDepositsPage />} />
    <Route path="withdrawals" element={<AdminWithdrawalsPage />} /><Route path="tickets" element={<AdminTicketsPage />} /><Route path="announcements" element={<AdminAnnouncementsPage />} />
    <Route path="coupons" element={<AdminCouponsPage />} /><Route path="affiliate" element={<AdminAffiliatePage />} /><Route path="api-keys" element={<AdminApiKeysPage />} />
    <Route path="settings" element={<AdminSettingsPage />} /><Route path="logs" element={<AdminLogsPage />} /><Route path="statistics" element={<AdminStatisticsPage />} />
  </>;
}

function App() {
  return <AppErrorBoundary><BrowserRouter><Suspense fallback={<PageLoader />}><Routes>
    <Route path="/" element={<LandingPage />} /><Route path="/login" element={<LoginPage />} /><Route path="/register" element={<RegisterPage />} />
    <Route path="/modules" element={<ModuleHubPage />} /><Route path="/module/:slug" element={<ModuleDetailPage />} />
    <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
      <Route index element={<DashboardHome />} /><Route path="services" element={<ServicesPage />} /><Route path="new-order" element={<NewOrderPage />} />
      <Route path="orders" element={<OrdersPage />} /><Route path="orders/running" element={<OrdersPage />} /><Route path="orders/completed" element={<OrdersPage />} /><Route path="orders/failed" element={<OrdersPage />} />
      <Route path="wallet" element={<WalletPage />} /><Route path="deposit" element={<DepositPage />} /><Route path="transactions" element={<WalletPage />} /><Route path="affiliate" element={<AffiliatePage />} />
      <Route path="api" element={<ApiPage />} /><Route path="tickets" element={<TicketsPage />} /><Route path="notifications" element={<NotificationsPage />} /><Route path="settings" element={<SettingsPage />} />
    </Route>
    <Route path="/dashboard/admin" element={<AdminRoutes />}><AdminContent /></Route><Route path="/admin" element={<AdminRoutes />}><AdminContent /></Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes></Suspense></BrowserRouter></AppErrorBoundary>;
}

export default App;
