/*
# SMM Panel core schema

1. New Tables
- `profiles` — extends auth.users with username, balance, role, referral code, api key, avatar, last login info.
- `categories` — service categories (Facebook, TikTok, Instagram, ...) with slug, icon, color, sort order.
- `services` — individual SMM services tied to a category and (optional) provider; price, min/max, refill, cancel, average time, featured, visibility.
- `orders` — user orders against a service; link, quantity, charge, status, start/remain counts, provider order id, timestamps.
- `wallet_transactions` — ledger of balance movements (deposit, order, refund, commission, bonus, transfer) with before/after balances.
- `notifications` — user-facing notifications (order, payment, ticket, info) with read flag.

2. Security
- RLS enabled on every table.
- profiles: each authenticated user reads/updates only their own profile.
- categories, services: public read (anon + authenticated) so the landing page and service catalog work without login; writes restricted to admins via service role only (no anon/authenticated write policies).
- orders, wallet_transactions, notifications: owner-scoped CRUD (auth.uid() = user_id), with user_id defaulted to auth.uid() so inserts that omit it still succeed.

3. Notes
- All tables use uuid primary keys (gen_random_uuid()).
- Timestamps default to now(); updated_at maintained via trigger.
- Soft delete via deleted_at on data tables.
- Composite indexes added for common query patterns (orders by user+status, orders by status+created_at, services by category+status, notifications by user+read).
- A trigger function `set_updated_at()` bumps updated_at on row update; applied to every table that has updated_at.
*/

-- Shared updated_at trigger function (idempotent)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  email text NOT NULL,
  phone text,
  avatar text,
  balance numeric(18,2) NOT NULL DEFAULT 0,
  role text NOT NULL DEFAULT 'MEMBER',
  status text NOT NULL DEFAULT 'ACTIVE',
  email_verified boolean NOT NULL DEFAULT false,
  two_factor_enabled boolean NOT NULL DEFAULT false,
  referral_code text UNIQUE NOT NULL,
  referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  api_key text UNIQUE,
  last_login_at timestamptz,
  last_login_ip text,
  country text,
  timezone text NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  language text NOT NULL DEFAULT 'vi',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text,
  color text,
  sort_order int NOT NULL DEFAULT 0,
  status boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_read_public" ON public.categories;
CREATE POLICY "categories_read_public" ON public.categories FOR SELECT
  TO anon, authenticated USING (true);

DROP TRIGGER IF EXISTS categories_updated_at ON public.categories;
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- services
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  provider_id text,
  provider_service_id text,
  name text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'DEFAULT',
  price numeric(18,4) NOT NULL DEFAULT 0,
  cost numeric(18,4) NOT NULL DEFAULT 0,
  profit numeric(18,4) NOT NULL DEFAULT 0,
  minimum int NOT NULL DEFAULT 1,
  maximum int NOT NULL DEFAULT 1000,
  refill boolean NOT NULL DEFAULT false,
  cancel boolean NOT NULL DEFAULT false,
  average_time text,
  featured boolean NOT NULL DEFAULT false,
  status boolean NOT NULL DEFAULT true,
  visibility boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_services_category_status ON public.services(category_id, status);
CREATE INDEX IF NOT EXISTS idx_services_featured ON public.services(featured) WHERE featured = true;

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_read_public" ON public.services;
CREATE POLICY "services_read_public" ON public.services FOR SELECT
  TO anon, authenticated USING (true);

DROP TRIGGER IF EXISTS services_updated_at ON public.services;
CREATE TRIGGER services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- orders
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  provider_order_id text,
  link text NOT NULL,
  quantity int NOT NULL,
  start_count int,
  current_count int,
  remains int,
  charge numeric(18,2) NOT NULL DEFAULT 0,
  cost numeric(18,2) NOT NULL DEFAULT 0,
  profit numeric(18,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'PENDING',
  refill_status text NOT NULL DEFAULT 'NONE',
  cancel_status text NOT NULL DEFAULT 'NONE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_orders_user_status ON public.orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_service ON public.orders(service_id);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
CREATE POLICY "orders_select_own" ON public.orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "orders_insert_own" ON public.orders;
CREATE POLICY "orders_insert_own" ON public.orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "orders_update_own" ON public.orders;
CREATE POLICY "orders_update_own" ON public.orders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "orders_delete_own" ON public.orders;
CREATE POLICY "orders_delete_own" ON public.orders FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- wallet_transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  amount numeric(18,2) NOT NULL,
  balance_before numeric(18,2) NOT NULL DEFAULT 0,
  balance_after numeric(18,2) NOT NULL DEFAULT 0,
  description text NOT NULL,
  reference_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_wallet_user_type ON public.wallet_transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_wallet_created ON public.wallet_transactions(created_at);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet_select_own" ON public.wallet_transactions;
CREATE POLICY "wallet_select_own" ON public.wallet_transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wallet_insert_own" ON public.wallet_transactions;
CREATE POLICY "wallet_insert_own" ON public.wallet_transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS wallet_updated_at ON public.wallet_transactions;
CREATE TRIGGER wallet_updated_at BEFORE UPDATE ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  type text NOT NULL DEFAULT 'INFO',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
CREATE POLICY "notifications_insert_own" ON public.notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS notifications_updated_at ON public.notifications;
CREATE TRIGGER notifications_updated_at BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
