import { supabase } from '@/lib/supabase';
import type { ICategory, IService, IOrder, IWalletTransaction, INotification, IDeposit, ITicket, ITicketReply, IAffiliate, IApiKey, IWithdraw } from '@/lib/types';

const PUBLIC_SERVICE_COLUMNS = 'id,category_id,name,description,type,price,minimum,maximum,refill,cancel,average_time,estimated_time,average_speed,featured,status,visibility,sort_order,icon,tags,api_type,created_at,updated_at';

export async function fetchCategories(): Promise<ICategory[]> {
  const { data, error } = await supabase.from('categories').select('*').eq('status', true).order('sort_order', { ascending: true });
  if (error) throw error;
  return data as ICategory[];
}

export async function fetchCategoryBySlug(slug: string): Promise<ICategory | null> {
  const { data, error } = await supabase.from('categories').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data as ICategory | null;
}

export async function fetchServices(filters?: { categoryId?: string; search?: string; featuredOnly?: boolean }): Promise<IService[]> {
  let query = supabase.from('services').select(PUBLIC_SERVICE_COLUMNS).eq('status', true).eq('visibility', true).order('sort_order', { ascending: true });
  if (filters?.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters?.featuredOnly) query = query.eq('featured', true);
  if (filters?.search) query = query.ilike('name', `%${filters.search}%`);
  const { data, error } = await query.limit(500);
  if (error) throw error;
  return data as unknown as IService[];
}

export async function fetchServiceById(id: string): Promise<IService | null> {
  const { data, error } = await supabase.from('services').select(PUBLIC_SERVICE_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as unknown as IService | null;
}

export async function fetchOrders(filters?: { status?: string; limit?: number }): Promise<IOrder[]> {
  let query = supabase.from('orders').select('*, service:services(*)').order('created_at', { ascending: false });
  if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
  const { data, error } = await query.limit(filters?.limit ?? 100);
  if (error) throw error;
  return data as unknown as IOrder[];
}

export async function createOrder(serviceId: string, link: string, quantity: number): Promise<{ success: boolean; orderId?: string; message?: string }> {
  const { data, error } = await supabase.rpc('create_order', { p_service_id: serviceId, p_link: link, p_quantity: quantity });
  if (error) return { success: false, message: error.message };
  const result = data as { success: boolean; order_id?: string; message?: string };
  if (!result.success) return { success: false, message: result.message };
  return { success: true, orderId: result.order_id, message: result.message };
}

export async function fetchWalletTransactions(limit = 100): Promise<IWalletTransaction[]> {
  const { data, error } = await supabase.from('wallet_transactions').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data as IWalletTransaction[];
}

export async function fetchWalletStats(): Promise<{ deposited: number; spent: number; refunded: number; commission: number }> {
  const { data, error } = await supabase.rpc('get_wallet_stats');
  if (error || !data) return { deposited: 0, spent: 0, refunded: 0, commission: 0 };
  return data as { deposited: number; spent: number; refunded: number; commission: number };
}

export async function fetchNotifications(unreadOnly = false): Promise<INotification[]> {
  let query = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
  if (unreadOnly) query = query.eq('read', false);
  const { data, error } = await query;
  if (error) throw error;
  return data as INotification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('read', false);
  if (error) throw error;
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('read', false);
  if (error) return 0;
  return count ?? 0;
}

export async function fetchDeposits(): Promise<IDeposit[]> {
  const { data, error } = await supabase.from('deposits').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data as IDeposit[];
}

export async function createDeposit(bank: string, amount: number): Promise<{ success: boolean; depositId?: string; txnCode?: string; message?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, message: 'Chưa đăng nhập' };
  const { data, error } = await supabase.rpc('create_deposit_request', { p_bank: bank, p_amount: amount });
  if (error) return { success: false, message: error.message };
  const result = data as { success: boolean; deposit_id?: string; txn_code?: string; message?: string };
  return { success: Boolean(result.success), depositId: result.deposit_id, txnCode: result.txn_code, message: result.message };
}

export async function fetchTickets(): Promise<ITicket[]> {
  const { data, error } = await supabase.from('tickets').select('*').order('updated_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data as ITicket[];
}

export async function createTicket(subject: string, department: string, message: string): Promise<{ success: boolean; ticketId?: string; message?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { success: false, message: 'Chưa đăng nhập' };
  const { data, error } = await supabase.from('tickets').insert({ user_id: userData.user.id, subject, department, priority: 'MEDIUM', status: 'OPEN' }).select('id').single();
  if (error) return { success: false, message: error.message };
  const { error: replyError } = await supabase.from('ticket_replies').insert({ ticket_id: data.id, user_id: userData.user.id, message });
  if (replyError) return { success: false, message: replyError.message };
  return { success: true, ticketId: data.id };
}

export async function fetchTicketReplies(ticketId: string): Promise<ITicketReply[]> {
  const { data, error } = await supabase.from('ticket_replies').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
  if (error) throw error;
  return data as ITicketReply[];
}

export async function sendTicketReply(ticketId: string, message: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  const { error } = await supabase.from('ticket_replies').insert({ ticket_id: ticketId, user_id: userData.user.id, message });
  if (error) throw error;
  const { error: ticketError } = await supabase.from('tickets').update({ status: 'USER_REPLY' }).eq('id', ticketId);
  if (ticketError) throw ticketError;
}

export async function fetchAffiliate(): Promise<IAffiliate | null> {
  const { data, error } = await supabase.from('affiliates').select('*').maybeSingle();
  if (error) throw error;
  return data as IAffiliate | null;
}

export async function ensureAffiliate(): Promise<IAffiliate | null> {
  const existing = await fetchAffiliate();
  if (existing) return existing;
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data: profileData } = await supabase.from('profiles').select('referral_code').eq('id', userData.user.id).maybeSingle();
  const code = profileData?.referral_code || 'REF' + Date.now().toString(36).toUpperCase().slice(-4);
  const { data, error } = await supabase.from('affiliates').insert({ user_id: userData.user.id, code }).select('*').single();
  if (error) return null;
  return data as IAffiliate;
}

export async function fetchApiKeys(): Promise<IApiKey[]> {
  const { data, error } = await supabase.from('api_keys').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as IApiKey[];
}

export async function generateApiKey(): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Chưa đăng nhập');
  const key = 'bsh_live_' + crypto.randomUUID().replace(/-/g, '');
  const { error } = await supabase.from('api_keys').insert({ user_id: userData.user.id, key, status: 'ACTIVE' });
  if (error) throw error;
  return key;
}

export async function revokeApiKey(id: string): Promise<void> {
  const { error } = await supabase.from('api_keys').update({ status: 'REVOKED' }).eq('id', id);
  if (error) throw error;
}

export async function refillOrder(orderId: string): Promise<{ success: boolean; message?: string }> {
  const { data, error } = await supabase.rpc('refill_order', { p_order_id: orderId });
  if (error) return { success: false, message: error.message };
  return data as { success: boolean; message?: string };
}

export async function cancelOrder(orderId: string): Promise<{ success: boolean; message?: string }> {
  const { data, error } = await supabase.rpc('cancel_order', { p_order_id: orderId });
  if (error) return { success: false, message: error.message };
  return data as { success: boolean; message?: string };
}

export async function requestWithdraw(amount: number, bank: string, accountNumber: string, accountName: string): Promise<{ success: boolean; message?: string }> {
  const { data, error } = await supabase.rpc('request_withdraw', { p_amount: amount, p_bank: bank, p_account_number: accountNumber, p_account_name: accountName });
  if (error) return { success: false, message: error.message };
  return data as { success: boolean; message?: string };
}

export async function fetchWithdrawals(): Promise<IWithdraw[]> {
  const { data, error } = await supabase.from('withdrawals').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data as IWithdraw[];
}

export async function fetchDashboardHomeStats(): Promise<{ open_tickets: number; commission: number; total_orders: number; completed_orders: number; pending_orders: number; platform_stats: Record<string, number> }> {
  const { data, error } = await supabase.rpc('fetch_dashboard_home_stats');
  if (error || !data) return { open_tickets: 0, commission: 0, total_orders: 0, completed_orders: 0, pending_orders: 0, platform_stats: {} };
  return data as { open_tickets: number; commission: number; total_orders: number; completed_orders: number; pending_orders: number; platform_stats: Record<string, number> };
}

export async function fetchPublicSettings(): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.from('settings').select('key, value').in('key', ['bank_name', 'bank_account', 'bank_holder', 'deposit_min', 'deposit_max', 'withdraw_min', 'withdraw_fee', 'site_name']);
  if (error) return {};
  const result: Record<string, unknown> = {};
  (data ?? []).forEach((row: { key: string; value: unknown }) => { result[row.key] = row.value; });
  return result;
}

export async function fetchNotificationPrefs(): Promise<Record<string, boolean>> {
  const { data, error } = await supabase.rpc('fetch_notification_prefs');
  if (error || !data) return { order_updates: true, payment_updates: true, ticket_replies: true, promotions: false };
  return data as Record<string, boolean>;
}

export async function saveNotificationPrefs(prefs: Record<string, boolean>): Promise<void> {
  const { error } = await supabase.rpc('save_notification_prefs', { p_prefs: prefs });
  if (error) throw error;
}

export async function changePassword(newPassword: string): Promise<{ success: boolean; message?: string }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { success: false, message: error.message };
  return { success: true };
}

export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; message?: string }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
  if (error) return { success: false, message: error.message };
  return { success: true };
}

export async function uploadAvatar(file: File): Promise<string | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const ext = file.name.split('.').pop() ?? 'png';
  const path = `${userData.user.id}/avatar.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

export async function fetchAllUsers(): Promise<{ id: string; username: string; email: string; balance: number; role: string; status: string; created_at: string }[]> {
  const { data, error } = await supabase.rpc('admin_fetch_users', { p_limit: 100, p_offset: 0 });
  if (error) throw error;
  return data as { id: string; username: string; email: string; balance: number; role: string; status: string; created_at: string }[];
}

export async function fetchAdminStats(): Promise<{ totalRevenue: number; totalUsers: number; totalOrders: number; completedOrders: number; pendingOrders: number; failedOrders: number }> {
  const { data, error } = await supabase.rpc('admin_fetch_stats');
  if (error) throw error;
  return data as { totalRevenue: number; totalUsers: number; totalOrders: number; completedOrders: number; pendingOrders: number; failedOrders: number };
}
