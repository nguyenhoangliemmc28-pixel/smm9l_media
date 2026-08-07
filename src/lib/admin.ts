import { supabase } from '@/lib/supabase';
import type {
  IProvider, IWithdraw, IAnnouncement, ICoupon, IAdminLog,
  IAdminOrder, IAdminDeposit, IAdminWalletTx, IAdminTicket,
  ISetting, IService, ICategory, ITicketReply,
} from '@/lib/types';

// ============ Providers ============
export async function fetchProviders(): Promise<IProvider[]> {
  const { data, error } = await supabase.rpc('admin_fetch_providers');
  if (error) throw error;
  return (data ?? []) as IProvider[];
}

export async function createProvider(name: string, apiUrl: string, apiKey: string, description: string): Promise<void> {
  const { error } = await supabase.rpc('admin_create_provider', { p_name: name, p_api_url: apiUrl, p_api_key: apiKey, p_description: description });
  if (error) throw error;
}

export async function updateProvider(id: string, name: string, apiUrl: string, apiKey: string, status: string, description: string): Promise<void> {
  const { error } = await supabase.rpc('admin_update_provider', { p_id: id, p_name: name, p_api_url: apiUrl, p_api_key: apiKey, p_status: status, p_description: description });
  if (error) throw error;
}

export async function deleteProvider(id: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_provider', { p_id: id });
  if (error) throw error;
}

// ============ Withdrawals ============
export async function fetchWithdrawals(limit = 100, offset = 0): Promise<IWithdraw[]> {
  const { data, error } = await supabase.rpc('admin_fetch_withdrawals', { p_limit: limit, p_offset: offset });
  if (error) throw error;
  return (data ?? []) as IWithdraw[];
}

export async function processWithdrawal(id: string, action: 'APPROVE' | 'REJECT'): Promise<void> {
  const { error } = await supabase.rpc('admin_process_withdrawal', { p_id: id, p_action: action });
  if (error) throw error;
}

// ============ Announcements ============
export async function fetchAnnouncements(): Promise<IAnnouncement[]> {
  const { data, error } = await supabase.rpc('admin_fetch_announcements');
  if (error) throw error;
  return (data ?? []) as IAnnouncement[];
}

export async function saveAnnouncement(a: Partial<IAnnouncement> & { id?: string }): Promise<void> {
  const { error } = await supabase.rpc('admin_save_announcement', {
    p_id: a.id ?? null,
    p_title: a.title ?? '',
    p_content: a.content ?? '',
    p_type: a.type ?? 'INFO',
    p_status: a.status ?? 'ACTIVE',
    p_starts_at: a.starts_at ? new Date(a.starts_at).toISOString() : null,
    p_ends_at: a.ends_at ? new Date(a.ends_at).toISOString() : null,
  });
  if (error) throw error;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_announcement', { p_id: id });
  if (error) throw error;
}

// ============ Coupons ============
export async function fetchCoupons(): Promise<ICoupon[]> {
  const { data, error } = await supabase.rpc('admin_fetch_coupons');
  if (error) throw error;
  return (data ?? []) as ICoupon[];
}

export async function saveCoupon(c: Partial<ICoupon> & { id?: string }): Promise<void> {
  const { error } = await supabase.rpc('admin_save_coupon', {
    p_id: c.id ?? null,
    p_code: c.code ?? '',
    p_type: c.type ?? 'PERCENT',
    p_value: c.value ?? 0,
    p_min_order: c.min_order ?? 0,
    p_max_discount: c.max_discount ?? null,
    p_usage_limit: c.usage_limit ?? null,
    p_per_user_limit: c.per_user_limit ?? 1,
    p_status: c.status ?? 'ACTIVE',
    p_expires_at: c.expires_at ? new Date(c.expires_at).toISOString() : null,
  });
  if (error) throw error;
}

export async function deleteCoupon(id: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_coupon', { p_id: id });
  if (error) throw error;
}

// ============ Logs ============
export async function fetchLogs(limit = 100, offset = 0): Promise<IAdminLog[]> {
  const { data, error } = await supabase.rpc('admin_fetch_logs', { p_limit: limit, p_offset: offset });
  if (error) throw error;
  return (data ?? []) as IAdminLog[];
}

// ============ Orders (all users) ============
export async function fetchAllOrders(limit = 100, offset = 0, status?: string): Promise<IAdminOrder[]> {
  const { data, error } = await supabase.rpc('admin_fetch_orders_all', {
    p_limit: limit, p_offset: offset, p_status: status && status !== 'all' ? status : null,
  });
  if (error) throw error;
  return (data ?? []) as IAdminOrder[];
}

export async function updateOrderStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase.rpc('admin_update_order', { p_id: id, p_status: status });
  if (error) throw error;
}

// ============ Deposits (all users) ============
export async function fetchAllDeposits(limit = 100, offset = 0): Promise<IAdminDeposit[]> {
  const { data, error } = await supabase.rpc('admin_fetch_deposits_all', { p_limit: limit, p_offset: offset });
  if (error) throw error;
  return (data ?? []) as IAdminDeposit[];
}

export async function rejectDeposit(id: string): Promise<void> {
  const { error } = await supabase.rpc('admin_reject_deposit', { p_id: id });
  if (error) throw error;
}

export async function approveDeposit(id: string): Promise<void> {
  const { error } = await supabase.rpc('process_deposit', { p_deposit_id: id });
  if (error) throw error;
}

// ============ Wallet Transactions (all users) ============
export async function fetchAllWalletTransactions(limit = 100, offset = 0, type?: string): Promise<IAdminWalletTx[]> {
  const { data, error } = await supabase.rpc('admin_fetch_wallet_all', {
    p_limit: limit, p_offset: offset, p_type: type && type !== 'all' ? type : null,
  });
  if (error) throw error;
  return (data ?? []) as IAdminWalletTx[];
}

export async function adjustBalance(userId: string, amount: number, reason: string): Promise<void> {
  const { error } = await supabase.rpc('admin_adjust_balance', { p_user_id: userId, p_amount: amount, p_reason: reason });
  if (error) throw error;
}

// ============ Users ============
export interface IAdminUser {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  balance: number;
  role: string;
  status: string;
  email_verified: boolean;
  two_factor_enabled: boolean;
  referral_code: string;
  referred_by: string | null;
  country: string | null;
  notes: string | null;
  last_login_at: string | null;
  created_at: string;
}

export async function fetchUsersFull(limit = 100, offset = 0, search?: string, role?: string, status?: string): Promise<IAdminUser[]> {
  const { data, error } = await supabase.rpc('admin_fetch_users_full', {
    p_limit: limit, p_offset: offset,
    p_search: search || null, p_role: role || null, p_status: status || null,
  });
  if (error) throw error;
  return (data ?? []) as IAdminUser[];
}

export async function updateUser(id: string, role: string, status: string, notes: string): Promise<void> {
  const { error } = await supabase.rpc('admin_update_user', { p_id: id, p_role: role, p_status: status, p_notes: notes });
  if (error) throw error;
}

// ============ Services (all, including disabled) ============
export async function fetchAllServices(limit = 200, offset = 0, categoryId?: string, search?: string): Promise<IService[]> {
  const { data, error } = await supabase.rpc('admin_fetch_services_all', {
    p_limit: limit, p_offset: offset,
    p_category_id: categoryId && categoryId !== 'all' ? categoryId : null,
    p_search: search || null,
  });
  if (error) throw error;
  return (data ?? []) as unknown as IService[];
}

export async function saveService(svc: Partial<IService> & { id?: string }): Promise<void> {
  const { error } = await supabase.rpc('admin_save_service', {
    p_id: svc.id ?? null,
    p_category_id: svc.category_id,
    p_provider_id: svc.provider_id ?? null,
    p_name: svc.name ?? '',
    p_description: svc.description ?? '',
    p_price: svc.price ?? 0,
    p_cost: svc.cost ?? 0,
    p_minimum: svc.minimum ?? 1,
    p_maximum: svc.maximum ?? 1000,
    p_refill: svc.refill ?? false,
    p_cancel: svc.cancel ?? false,
    p_average_time: svc.average_time ?? null,
    p_estimated_time: svc.estimated_time ?? null,
    p_average_speed: svc.average_speed ?? null,
    p_featured: svc.featured ?? false,
    p_status: svc.status ?? true,
    p_visibility: svc.visibility ?? true,
    p_sort_order: svc.sort_order ?? 0,
    p_icon: svc.icon ?? null,
    p_tags: svc.tags ?? null,
    p_api_type: svc.api_type ?? 'DEFAULT',
  });
  if (error) throw error;
}

export async function deleteService(id: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_service', { p_id: id });
  if (error) throw error;
}

export async function duplicateService(id: string): Promise<void> {
  const { error } = await supabase.rpc('admin_duplicate_service', { p_id: id });
  if (error) throw error;
}

// ============ Categories ============
export async function fetchAllCategories(): Promise<ICategory[]> {
  const { data, error } = await supabase.rpc('admin_fetch_categories_all');
  if (error) throw error;
  return (data ?? []) as ICategory[];
}

export async function saveCategory(cat: Partial<ICategory> & { id?: string }): Promise<void> {
  const { error } = await supabase.rpc('admin_save_category', {
    p_id: cat.id ?? null,
    p_name: cat.name ?? '',
    p_slug: cat.slug ?? '',
    p_icon: cat.icon ?? null,
    p_color: cat.color ?? null,
    p_sort_order: cat.sort_order ?? 0,
    p_status: cat.status ?? true,
  });
  if (error) throw error;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_category', { p_id: id });
  if (error) throw error;
}

// ============ Tickets (all users) ============
export async function fetchAllTickets(limit = 100, offset = 0, status?: string): Promise<IAdminTicket[]> {
  const { data, error } = await supabase.rpc('admin_fetch_tickets_all', {
    p_limit: limit, p_offset: offset, p_status: status && status !== 'all' ? status : null,
  });
  if (error) throw error;
  return (data ?? []) as IAdminTicket[];
}

export async function replyTicket(ticketId: string, message: string): Promise<void> {
  const { error } = await supabase.rpc('admin_reply_ticket', { p_ticket_id: ticketId, p_message: message });
  if (error) throw error;
}

export async function fetchTicketReplies(ticketId: string): Promise<ITicketReply[]> {
  const { data, error } = await supabase.rpc('admin_fetch_ticket_replies', { p_ticket_id: ticketId });
  if (error) return [];
  return (data ?? []) as ITicketReply[];
}

export async function updateTicketStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase.rpc('admin_update_ticket_status', { p_id: id, p_status: status });
  if (error) throw error;
}

// ============ Settings ============
export async function fetchAllSettings(): Promise<ISetting[]> {
  const { data, error } = await supabase.rpc('admin_fetch_settings_all');
  if (error) throw error;
  return (data ?? []) as ISetting[];
}

export async function updateSetting(key: string, value: unknown): Promise<void> {
  const { error } = await supabase.rpc('admin_update_setting', { p_key: key, p_value: value });
  if (error) throw error;
}

export async function deleteSetting(key: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_setting', { p_key: key });
  if (error) throw error;
}

// ============ Broadcast ============
export async function broadcastNotification(title: string, content: string, type: string): Promise<void> {
  const { error } = await supabase.rpc('admin_broadcast_notification', { p_title: title, p_content: content, p_type: type });
  if (error) throw error;
}

// ============ Provider Integration (via edge function) ============
const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/provider-api`;
const ORDER_SYNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/order-sync`;

async function callProviderEdge(action: string, providerId: string, extra: Record<string, unknown> = {}): Promise<{ success: boolean; message?: string; [k: string]: unknown }> {
  const { data: { session } } = await supabase.auth.getSession();
  const resp = await fetch(EDGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ action, providerId, ...extra }),
  });
  return resp.json();
}

export async function syncAllOrders(): Promise<{ success: boolean; synced?: number; message?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const resp = await fetch(ORDER_SYNC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
  });
  return resp.json();
}

export async function testProviderConnection(providerId: string): Promise<{ success: boolean; message?: string; balance?: number }> {
  return callProviderEdge('test', providerId);
}

export async function importProviderServices(providerId: string): Promise<{ success: boolean; imported?: number; message?: string }> {
  return callProviderEdge('import', providerId);
}

export async function syncProviderPrices(providerId: string): Promise<{ success: boolean; synced?: number; message?: string }> {
  return callProviderEdge('sync_prices', providerId);
}

// ============ Admin Stats ============
export async function fetchAdminStats(): Promise<{
  totalRevenue: number; totalUsers: number; totalOrders: number;
  completedOrders: number; pendingOrders: number; failedOrders: number;
}> {
  const { data, error } = await supabase.rpc('admin_fetch_stats');
  if (error) throw error;
  return data as { totalRevenue: number; totalUsers: number; totalOrders: number; completedOrders: number; pendingOrders: number; failedOrders: number; };
}

export async function fetchDashboardOverview(): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('admin_dashboard_overview');
  if (error) throw error;
  return data as Record<string, number>;
}

export async function fetchRevenueChart(): Promise<Array<{ date: string; revenue: number; orders: number }>> {
  const { data, error } = await supabase.rpc('admin_fetch_revenue_chart');
  if (error || !data) return [];
  return data as Array<{ date: string; revenue: number; orders: number }>;
}

export async function fetchServiceDistribution(): Promise<Array<{ name: string; orders: number }>> {
  const { data, error } = await supabase.rpc('admin_fetch_service_distribution');
  if (error || !data) return [];
  return data as Array<{ name: string; orders: number }>;
}

export async function resetUserPassword(userId: string): Promise<{ success: boolean; message?: string }> {
  const { data, error } = await supabase.rpc('admin_reset_password', { p_user_id: userId });
  if (error) return { success: false, message: error.message };
  return data as { success: boolean; message?: string };
}

export async function deleteUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_user', { p_user_id: userId });
  if (error) throw error;
}

// ============ Affiliates ============
export interface IAdminAffiliate {
  id: string;
  user_id: string;
  code: string;
  commission: number;
  clicks: number;
  conversions: number;
  created_at: string;
  username: string;
  email: string;
  balance: number;
  referral_count: number;
}

export async function fetchAffiliates(limit = 100, offset = 0): Promise<IAdminAffiliate[]> {
  const { data, error } = await supabase.rpc('admin_fetch_affiliates', { p_limit: limit, p_offset: offset });
  if (error) throw error;
  return (data ?? []) as IAdminAffiliate[];
}

export async function updateAffiliateCommission(affiliateId: string, commission: number): Promise<void> {
  const { error } = await supabase.rpc('admin_update_affiliate_commission', { p_affiliate_id: affiliateId, p_commission: commission });
  if (error) throw error;
}

// ============ API Keys ============
export interface IAdminApiKey {
  id: string;
  user_id: string;
  key: string;
  status: 'ACTIVE' | 'REVOKED';
  last_used_at: string | null;
  created_at: string;
  username: string;
  email: string;
}

export async function fetchAllApiKeys(limit = 100, offset = 0): Promise<IAdminApiKey[]> {
  const { data, error } = await supabase.rpc('admin_fetch_all_api_keys', { p_limit: limit, p_offset: offset });
  if (error) throw error;
  return (data ?? []) as IAdminApiKey[];
}

export async function revokeApiKey(keyId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_revoke_api_key', { p_key_id: keyId });
  if (error) throw error;
}
