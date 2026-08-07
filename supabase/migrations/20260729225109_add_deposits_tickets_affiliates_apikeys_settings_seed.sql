/*
# Add deposits, tickets, affiliates, api_keys, settings tables + seed data

1. New Tables
- deposits: user deposit requests (bank transfer, QR, momo) with auto-confirm status
- tickets: support tickets with subject, department, priority, status
- ticket_replies: conversation messages on a ticket
- affiliates: per-user affiliate program data (code, commission, clicks, conversions)
- affiliate_commissions: individual commission records from referred users' orders
- api_keys: user API keys for API access
- settings: key/value app configuration

2. New Functions
- handle_new_user: trigger that auto-creates a profile row when a user signs up via Supabase Auth
- process_deposit: RPC that confirms a deposit and credits the user's wallet atomically
- create_order: RPC that creates an order and deducts balance atomically

3. Seed Data
- 14 categories (Facebook, TikTok, Instagram, YouTube, Telegram, Discord, Threads, Spotify, Shopee, Website Traffic, Google Review, Twitter, Pinterest, LinkedIn)
- 12 sample services across categories with real pricing, min/max, refill/cancel flags

4. Security
- RLS enabled on all new tables with owner-scoped policies (auth.uid() = user_id)
- settings readable by all authenticated users
- handle_new_user runs as SECURITY DEFINER to insert into profiles
- process_deposit and create_order run as SECURITY DEFINER for atomic balance updates
*/

-- ============ DEPOSITS ============
CREATE TABLE IF NOT EXISTS public.deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  txn_code text UNIQUE NOT NULL,
  bank text NOT NULL,
  amount numeric(18,2) NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deposits_user ON public.deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON public.deposits(status);
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deposits_select_own" ON public.deposits;
CREATE POLICY "deposits_select_own" ON public.deposits FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "deposits_insert_own" ON public.deposits;
CREATE POLICY "deposits_insert_own" ON public.deposits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "deposits_update_own" ON public.deposits;
CREATE POLICY "deposits_update_own" ON public.deposits FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS deposits_updated_at ON public.deposits;
CREATE TRIGGER deposits_updated_at BEFORE UPDATE ON public.deposits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ TICKETS ============
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  department text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'MEDIUM',
  status text NOT NULL DEFAULT 'OPEN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tickets_select_own" ON public.tickets;
CREATE POLICY "tickets_select_own" ON public.tickets FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "tickets_insert_own" ON public.tickets;
CREATE POLICY "tickets_insert_own" ON public.tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "tickets_update_own" ON public.tickets;
CREATE POLICY "tickets_update_own" ON public.tickets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS tickets_updated_at ON public.tickets;
CREATE TRIGGER tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ TICKET REPLIES ============
CREATE TABLE IF NOT EXISTS public.ticket_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_id uuid,
  message text NOT NULL,
  attachments jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket ON public.ticket_replies(ticket_id);
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ticket_replies_select_own" ON public.ticket_replies;
CREATE POLICY "ticket_replies_select_own" ON public.ticket_replies FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tickets WHERE tickets.id = ticket_replies.ticket_id AND tickets.user_id = auth.uid()));
DROP POLICY IF EXISTS "ticket_replies_insert_own" ON public.ticket_replies;
CREATE POLICY "ticket_replies_insert_own" ON public.ticket_replies FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tickets WHERE tickets.id = ticket_replies.ticket_id AND tickets.user_id = auth.uid()));

-- ============ AFFILIATES ============
CREATE TABLE IF NOT EXISTS public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  commission numeric(18,2) NOT NULL DEFAULT 0,
  clicks int NOT NULL DEFAULT 0,
  conversions int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "affiliates_select_own" ON public.affiliates;
CREATE POLICY "affiliates_select_own" ON public.affiliates FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "affiliates_insert_own" ON public.affiliates;
CREATE POLICY "affiliates_insert_own" ON public.affiliates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "affiliates_update_own" ON public.affiliates;
CREATE POLICY "affiliates_update_own" ON public.affiliates FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS affiliates_updated_at ON public.affiliates;
CREATE TRIGGER affiliates_updated_at BEFORE UPDATE ON public.affiliates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ AFFILIATE COMMISSIONS ============
CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  order_id uuid,
  amount numeric(18,2) NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ac_affiliate ON public.affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_ac_user ON public.affiliate_commissions(user_id);
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ac_select_own" ON public.affiliate_commissions;
CREATE POLICY "ac_select_own" ON public.affiliate_commissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.affiliates WHERE affiliates.id = affiliate_commissions.affiliate_id AND affiliates.user_id = auth.uid()));

-- ============ API KEYS ============
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  key text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_apikeys_user ON public.api_keys(user_id);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "apikeys_select_own" ON public.api_keys;
CREATE POLICY "apikeys_select_own" ON public.api_keys FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "apikeys_insert_own" ON public.api_keys;
CREATE POLICY "apikeys_insert_own" ON public.api_keys FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "apikeys_update_own" ON public.api_keys;
CREATE POLICY "apikeys_update_own" ON public.api_keys FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "apikeys_delete_own" ON public.api_keys;
CREATE POLICY "apikeys_delete_own" ON public.api_keys FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ SETTINGS ============
CREATE TABLE IF NOT EXISTS public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_read" ON public.settings;
CREATE POLICY "settings_read" ON public.settings FOR SELECT TO authenticated USING (true);
DROP TRIGGER IF EXISTS settings_updated_at ON public.settings;
CREATE TRIGGER settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ handle_new_user trigger ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    UPPER(SUBSTRING(MD5(NEW.id::text || random()::text) FROM 1 FOR 6))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ process_deposit RPC ============
CREATE OR REPLACE FUNCTION public.process_deposit(p_deposit_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deposit RECORD;
  v_balance_before numeric(18,2);
BEGIN
  SELECT * INTO v_deposit FROM public.deposits WHERE id = p_deposit_id AND status = 'PENDING' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Deposit not found or already processed'); END IF;

  SELECT balance INTO v_balance_before FROM public.profiles WHERE id = v_deposit.user_id FOR UPDATE;

  UPDATE public.profiles SET balance = balance + v_deposit.amount WHERE id = v_deposit.user_id;

  UPDATE public.deposits SET status = 'COMPLETED' WHERE id = p_deposit_id;

  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_before, balance_after, description, reference_id)
  VALUES (v_deposit.user_id, 'DEPOSIT', v_deposit.amount, v_balance_before, v_balance_before + v_deposit.amount,
          'Nạp tiền qua ' || v_deposit.bank, v_deposit.txn_code);

  INSERT INTO public.notifications (user_id, title, content, type)
  VALUES (v_deposit.user_id, 'Nạp tiền thành công',
          'Đã cộng ' || v_deposit.amount || '₫ vào ví qua ' || v_deposit.bank, 'PAYMENT');

  RETURN jsonb_build_object('success', true, 'message', 'Deposit processed');
END;
$$;

-- ============ create_order RPC ============
CREATE OR REPLACE FUNCTION public.create_order(
  p_service_id uuid,
  p_link text,
  p_quantity int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service RECORD;
  v_user_id uuid := auth.uid();
  v_balance numeric(18,2);
  v_charge numeric(18,2);
  v_order_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'message', 'Not authenticated'); END IF;

  SELECT * INTO v_service FROM public.services WHERE id = p_service_id AND status = true AND visibility = true FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Service not available'); END IF;

  IF p_quantity < v_service.minimum OR p_quantity > v_service.maximum THEN
    RETURN jsonb_build_object('success', false, 'message', 'Quantity out of range');
  END IF;

  v_charge := (v_service.price * p_quantity) / 1000;

  SELECT balance INTO v_balance FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF v_balance < v_charge THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient balance');
  END IF;

  UPDATE public.profiles SET balance = balance - v_charge WHERE id = v_user_id;

  INSERT INTO public.orders (user_id, service_id, link, quantity, charge, cost, profit, status)
  VALUES (v_user_id, p_service_id, p_link, p_quantity, v_charge, 0, v_charge, 'PENDING')
  RETURNING id INTO v_order_id;

  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_before, balance_after, description, reference_id)
  VALUES (v_user_id, 'ORDER', -v_charge, v_balance, v_balance - v_charge,
          'Đơn hàng ' || v_order_id, v_order_id::text);

  INSERT INTO public.notifications (user_id, title, content, type)
  VALUES (v_user_id, 'Đơn hàng đã tạo', 'Đơn hàng ' || v_order_id || ' đang chờ xử lý', 'ORDER');

  RETURN jsonb_build_object('success', true, 'order_id', v_order_id);
END;
$$;

-- ============ SEED: Categories ============
INSERT INTO public.categories (name, slug, icon, color, sort_order) VALUES
  ('Facebook', 'facebook', 'Facebook', '#1877F2', 1),
  ('TikTok', 'tiktok', 'Music2', '#FF0050', 2),
  ('Instagram', 'instagram', 'Instagram', '#E4405F', 3),
  ('YouTube', 'youtube', 'Youtube', '#FF0000', 4),
  ('Telegram', 'telegram', 'Send', '#26A5E4', 5),
  ('Discord', 'discord', 'MessageCircle', '#5865F2', 6),
  ('Threads', 'threads', 'MessageCircle', '#FFFFFF', 7),
  ('Spotify', 'spotify', 'Music', '#1DB954', 8),
  ('Shopee', 'shopee', 'ShoppingBag', '#EE4D2D', 9),
  ('Website Traffic', 'website-traffic', 'Globe', '#6EE7FF', 10),
  ('Google Review', 'google-review', 'Star', '#FFB300', 11),
  ('Twitter (X)', 'twitter', 'Twitter', '#FFFFFF', 12),
  ('Pinterest', 'pinterest', 'Image', '#E60023', 13),
  ('LinkedIn', 'linkedin', 'Linkedin', '#0A66C2', 14)
ON CONFLICT (slug) DO NOTHING;

-- ============ SEED: Services ============
INSERT INTO public.services (category_id, name, description, price, cost, minimum, maximum, refill, cancel, average_time, featured, sort_order)
SELECT id, 'Facebook Page Likes (Thật)', 'Tăng lượt thích trang Facebook từ tài khoản thật Việt Nam. Tốc độ ổn định, bền vững.', 25, 18, 50, 50000, true, false, '0-30 phút', true, 1
FROM public.categories WHERE slug = 'facebook'
ON CONFLICT DO NOTHING;

INSERT INTO public.services (category_id, name, description, price, cost, minimum, maximum, refill, cancel, average_time, featured, sort_order)
SELECT id, 'Facebook Post Reactions', 'Tăng cảm xúc (Like, Yêu thích, Wow) cho bài viết cụ thể.', 18, 12, 20, 20000, false, false, '0-15 phút', false, 2
FROM public.categories WHERE slug = 'facebook'
ON CONFLICT DO NOTHING;

INSERT INTO public.services (category_id, name, description, price, cost, minimum, maximum, refill, cancel, average_time, featured, sort_order)
SELECT id, 'TikTok Followers (Chất lượng cao)', 'Tăng theo dõi TikTok, nguồn hồ sơ chất lượng, refill 30 ngày.', 36, 28, 10, 100000, true, false, '0-1 giờ', true, 1
FROM public.categories WHERE slug = 'tiktok'
ON CONFLICT DO NOTHING;

INSERT INTO public.services (category_id, name, description, price, cost, minimum, maximum, refill, cancel, average_time, featured, sort_order)
SELECT id, 'TikTok Video Views', 'Tăng lượt xem video TikTok, khởi động nhanh, giá rẻ.', 2.4, 1.2, 100, 1000000, false, false, '0-5 phút', false, 2
FROM public.categories WHERE slug = 'tiktok'
ON CONFLICT DO NOTHING;

INSERT INTO public.services (category_id, name, description, price, cost, minimum, maximum, refill, cancel, average_time, featured, sort_order)
SELECT id, 'Instagram Followers (Brazil)', 'Tăng theo dõi Instagram từ Brazil, chất lượng tốt, refill 60 ngày.', 42, 32, 50, 80000, true, false, '0-2 giờ', true, 1
FROM public.categories WHERE slug = 'instagram'
ON CONFLICT DO NOTHING;

INSERT INTO public.services (category_id, name, description, price, cost, minimum, maximum, refill, cancel, average_time, featured, sort_order)
SELECT id, 'Instagram Reels Likes', 'Tăng like cho Reels Instagram, có thể hủy đơn.', 12, 8, 20, 50000, false, true, '0-10 phút', false, 2
FROM public.categories WHERE slug = 'instagram'
ON CONFLICT DO NOTHING;

INSERT INTO public.services (category_id, name, description, price, cost, minimum, maximum, refill, cancel, average_time, featured, sort_order)
SELECT id, 'YouTube Subscribers (Tốc độ chậm)', 'Tăng subscriber YouTube, tốc độ chậm, bền vững, refill 30 ngày.', 475, 380, 50, 20000, true, false, '1-6 giờ', true, 1
FROM public.categories WHERE slug = 'youtube'
ON CONFLICT DO NOTHING;

INSERT INTO public.services (category_id, name, description, price, cost, minimum, maximum, refill, cancel, average_time, featured, sort_order)
SELECT id, 'YouTube Watchtime 4000h', 'Dịch vụ tăng 4000 giờ xem để đủ điều kiện kiếm tiền.', 2400, 1800, 1, 1000, false, false, '1-7 ngày', false, 2
FROM public.categories WHERE slug = 'youtube'
ON CONFLICT DO NOTHING;

INSERT INTO public.services (category_id, name, description, price, cost, minimum, maximum, refill, cancel, average_time, featured, sort_order)
SELECT id, 'Telegram Channel Members', 'Tăng thành viên kênh Telegram, tốc độ nhanh.', 68, 52, 100, 100000, false, false, '0-30 phút', false, 1
FROM public.categories WHERE slug = 'telegram'
ON CONFLICT DO NOTHING;

INSERT INTO public.services (category_id, name, description, price, cost, minimum, maximum, refill, cancel, average_time, featured, sort_order)
SELECT id, 'Discord Server Members', 'Tăng thành viên máy chủ Discord, online ổn định.', 85, 65, 50, 50000, false, false, '0-2 giờ', false, 1
FROM public.categories WHERE slug = 'discord'
ON CONFLICT DO NOTHING;

INSERT INTO public.services (category_id, name, description, price, cost, minimum, maximum, refill, cancel, average_time, featured, sort_order)
SELECT id, 'Spotify Monthly Listeners', 'Tăng người nghe hàng tháng Spotify cho nghệ sĩ.', 320, 240, 1000, 500000, false, false, '1-3 ngày', true, 1
FROM public.categories WHERE slug = 'spotify'
ON CONFLICT DO NOTHING;

INSERT INTO public.services (category_id, name, description, price, cost, minimum, maximum, refill, cancel, average_time, featured, sort_order)
SELECT id, 'Shopee Product Sales', 'Tăng lượt bán sản phẩm Shopee, có thể hủy đơn.', 180, 140, 10, 5000, false, true, '0-1 giờ', false, 1
FROM public.categories WHERE slug = 'shopee'
ON CONFLICT DO NOTHING;

-- ============ SEED: Settings ============
INSERT INTO public.settings (key, value) VALUES
  ('site_name', '"BoostHub"'),
  ('affiliate_commission_rate', '15'),
  ('affiliate_min_withdraw', '50000'),
  ('deposit_min_amount', '50000'),
  ('duplicate_protection', 'false')
ON CONFLICT (key) DO NOTHING;
