import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from '@/pages/LandingPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminRoute, ProtectedRoute } from '@/components/auth/ProtectedRoute';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const DashboardHome = lazy(() => import('@/pages/dashboard/DashboardHome').then((m) => ({ default: m.DashboardHome })));
const ServicesPage = lazy(() => import('@/pages/dashboard/ServicesPage').then((m) => ({ default: m.ServicesPage })));
const NewOrderPage = lazy(() => import('@/pages/dashboard/NewOrderPage').then((m) => ({ default: m.NewOrderPage })));
const OrdersPage = lazy(() => import('@/pages/dashboard/OrdersPage').then((m) => ({ default: m.OrdersPage })));
const WalletPage = lazy(() => import('@/pages/dashboard/WalletPage').then((m) => ({ default: m.WalletPage })));
const DepositPage = lazy(() => import('@/pages/dashboard/DepositPage').then((m) => ({ default: m.DepositPage })));
const ApiPage = lazy(() => import('@/pages/dashboard/ApiPage').then((m) => ({ default: m.ApiPage })));
const AffiliatePage = lazy(() => import('@/pages/dashboard/AffiliatePage').then((m) => ({ default: m.AffiliatePage })));
const TicketsPage = lazy(() => import('@/pages/dashboard/TicketsPage').then((m) => ({ default: m.TicketsPage })));
const NotificationsPage = lazy(() => import('@/pages/dashboard/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const SettingsPage = lazy(() => import('@/pages/dashboard/SettingsPage').then((m) => ({ default: m.SettingsPage })));

// Admin pages
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })));
const AdminOrdersPage = lazy(() => import('@/pages/admin/AdminOrdersPage').then((m) => ({ default: m.AdminOrdersPage })));
const AdminServicesPage = lazy(() => import('@/pages/admin/AdminServicesPage').then((m) => ({ default: m.AdminServicesPage })));
const AdminCategoriesPage = lazy(() => import('@/pages/admin/AdminCategoriesPage').then((m) => ({ default: m.AdminCategoriesPage })));
const AdminProvidersPage = lazy(() => import('@/pages/admin/AdminProvidersPage').then((m) => ({ default: m.AdminProvidersPage })));
const AdminWalletPage = lazy(() => import('@/pages/admin/AdminWalletPage').then((m) => ({ default: m.AdminWalletPage })));
const AdminDepositsPage = lazy(() => import('@/pages/admin/AdminDepositsPage').then((m) => ({ default: m.AdminDepositsPage })));
const AdminTicketsPage = lazy(() => import('@/pages/admin/AdminTicketsPage').then((m) => ({ default: m.AdminTicketsPage })));
const AdminAnnouncementsPage = lazy(() => import('@/pages/admin/AdminAnnouncementsPage').then((m) => ({ default: m.AdminAnnouncementsPage })));
const AdminCouponsPage = lazy(() => import('@/pages/admin/AdminCouponsPage').then((m) => ({ default: m.AdminCouponsPage })));
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage })));
const AdminLogsPage = lazy(() => import('@/pages/admin/AdminLogsPage').then((m) => ({ default: m.AdminLogsPage })));
const AdminWithdrawalsPage = lazy(() => import('@/pages/admin/AdminWithdrawalsPage').then((m) => ({ default: m.AdminWithdrawalsPage })));
const AdminAffiliatePage = lazy(() => import('@/pages/admin/AdminAffiliatePage').then((m) => ({ default: m.AdminAffiliatePage })));
const AdminApiKeysPage = lazy(() => import('@/pages/admin/AdminApiKeysPage').then((m) => ({ default: m.AdminApiKeysPage })));
const AdminStatisticsPage = lazy(() => import('@/pages/admin/AdminStatisticsPage').then((m) => ({ default: m.AdminStatisticsPage })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin" />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<DashboardHome />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="new-order" element={<NewOrderPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/running" element={<OrdersPage />} />
            <Route path="orders/completed" element={<OrdersPage />} />
            <Route path="orders/failed" element={<OrdersPage />} />
            <Route path="wallet" element={<WalletPage />} />
            <Route path="deposit" element={<DepositPage />} />
            <Route path="transactions" element={<WalletPage />} />
            <Route path="affiliate" element={<AffiliatePage />} />
            <Route path="api" element={<ApiPage />} />
            <Route path="tickets" element={<TicketsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="/dashboard/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="services" element={<AdminServicesPage />} />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="providers" element={<AdminProvidersPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="wallet" element={<AdminWalletPage />} />
            <Route path="deposits" element={<AdminDepositsPage />} />
            <Route path="withdrawals" element={<AdminWithdrawalsPage />} />
            <Route path="tickets" element={<AdminTicketsPage />} />
            <Route path="announcements" element={<AdminAnnouncementsPage />} />
            <Route path="coupons" element={<AdminCouponsPage />} />
            <Route path="affiliate" element={<AdminAffiliatePage />} />
            <Route path="api-keys" element={<AdminApiKeysPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="logs" element={<AdminLogsPage />} />
            <Route path="statistics" element={<AdminStatisticsPage />} />
          </Route>
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="services" element={<AdminServicesPage />} />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="providers" element={<AdminProvidersPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="wallet" element={<AdminWalletPage />} />
            <Route path="deposits" element={<AdminDepositsPage />} />
            <Route path="withdrawals" element={<AdminWithdrawalsPage />} />
            <Route path="tickets" element={<AdminTicketsPage />} />
            <Route path="announcements" element={<AdminAnnouncementsPage />} />
            <Route path="coupons" element={<AdminCouponsPage />} />
            <Route path="affiliate" element={<AdminAffiliatePage />} />
            <Route path="api-keys" element={<AdminApiKeysPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="logs" element={<AdminLogsPage />} />
            <Route path="statistics" element={<AdminStatisticsPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
