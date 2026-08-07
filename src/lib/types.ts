export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'MODERATOR' | 'VIP' | 'MEMBER';
export type UserStatus = 'ACTIVE' | 'PENDING' | 'BANNED' | 'SUSPENDED';
export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'CANCELED'
  | 'REFUNDED'
  | 'FAILED'
  | 'PAUSED';
export type WalletTxType =
  | 'DEPOSIT'
  | 'WITHDRAW'
  | 'ORDER'
  | 'REFUND'
  | 'COMMISSION'
  | 'BONUS'
  | 'TRANSFER';
export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'ORDER' | 'PAYMENT' | 'TICKET';

export interface IProfile {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  balance: number;
  role: UserRole;
  status: UserStatus;
  email_verified: boolean;
  two_factor_enabled: boolean;
  referral_code: string;
  referred_by: string | null;
  api_key: string | null;
  last_login_at: string | null;
  last_login_ip: string | null;
  country: string | null;
  timezone: string;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface ICategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  status: boolean;
}

export interface IService {
  id: string;
  category_id: string;
  provider_id: string | null;
  provider_service_id?: string | null;
  name: string;
  description: string | null;
  type: string;
  price: number;
  cost: number;
  profit: number;
  minimum: number;
  maximum: number;
  refill: boolean;
  cancel: boolean;
  average_time: string | null;
  estimated_time: string | null;
  average_speed: string | null;
  featured: boolean;
  status: boolean;
  visibility: boolean;
  sort_order: number;
  icon: string | null;
  tags: string[] | null;
  api_type: string;
  created_at: string;
  category?: ICategory;
  category_name?: string;
  provider_name?: string;
}

export interface IProvider {
  id: string;
  name: string;
  api_url: string;
  api_key: string;
  status: string;
  description: string | null;
  balance: number;
  created_at: string;
}

export interface IWithdraw {
  id: string;
  user_id: string;
  amount: number;
  bank: string;
  account_number: string | null;
  account_name: string | null;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
  created_at: string;
  updated_at: string;
  username?: string;
}

export interface IAnnouncement {
  id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export interface ICoupon {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  min_order: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  per_user_limit: number;
  status: string;
  expires_at: string | null;
  created_at: string;
}

export interface IAdminLog {
  id: string;
  admin_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  admin_name?: string;
}

export interface IAdminOrder {
  id: string;
  user_id: string;
  service_id: string;
  provider_order_id: string | null;
  link: string;
  quantity: number;
  start_count: number | null;
  current_count: number | null;
  remains: number | null;
  charge: number;
  cost: number;
  profit: number;
  status: OrderStatus;
  refill_status: string;
  cancel_status: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  username: string;
  service_name: string;
  category_name: string;
}

export interface IAdminDeposit {
  id: string;
  user_id: string;
  txn_code: string;
  bank: string;
  amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  username: string;
}

export interface IAdminWalletTx {
  id: string;
  user_id: string;
  type: WalletTxType;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  reference_id: string | null;
  created_at: string;
  username: string;
}

export interface IAdminTicket {
  id: string;
  user_id: string;
  subject: string;
  department: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  username: string;
}

export interface ISetting {
  id: string;
  key: string;
  value: unknown;
  created_at: string;
  updated_at: string;
}

export interface IOrder {
  id: string;
  user_id: string;
  service_id: string;
  provider_order_id: string | null;
  link: string;
  quantity: number;
  start_count: number | null;
  current_count: number | null;
  remains: number | null;
  charge: number;
  cost: number;
  profit: number;
  status: OrderStatus;
  refill_status: string;
  cancel_status: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  service?: IService;
}

export interface IWalletTransaction {
  id: string;
  user_id: string;
  type: WalletTxType;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  reference_id: string | null;
  created_at: string;
}

export interface INotification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: NotificationType;
  read: boolean;
  created_at: string;
}

export interface IDeposit {
  id: string;
  user_id: string;
  txn_code: string;
  bank: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
  created_at: string;
  updated_at: string;
}

export interface ITicket {
  id: string;
  user_id: string;
  subject: string;
  department: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'ANSWERED' | 'USER_REPLY' | 'CLOSED';
  created_at: string;
  updated_at: string;
}

export interface ITicketReply {
  id: string;
  ticket_id: string;
  user_id: string | null;
  admin_id: string | null;
  message: string;
  attachments: unknown;
  created_at: string;
}

export interface IAffiliate {
  id: string;
  user_id: string;
  code: string;
  commission: number;
  clicks: number;
  conversions: number;
  created_at: string;
}

export interface IApiKey {
  id: string;
  user_id: string;
  key: string;
  status: 'ACTIVE' | 'REVOKED';
  last_used_at: string | null;
  created_at: string;
}
