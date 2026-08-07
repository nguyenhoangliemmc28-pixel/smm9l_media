-- ============ FIX: handle_new_user trigger ============
-- The trigger already exists from migration 20260729225109.
-- It reads username from raw_user_meta_data->>'username'.
-- The frontend signUp was NOT passing username in metadata, causing
-- the trigger to fall back to email prefix. We fix the frontend to pass
-- username in metadata, so the trigger works correctly.
-- The trigger uses ON CONFLICT (id) DO NOTHING, so duplicate inserts are safe.

-- ============ Add CHECK constraints ============
ALTER TABLE public.deposits ADD CONSTRAINT deposits_amount_positive CHECK (amount > 0);
ALTER TABLE public.orders ADD CONSTRAINT orders_quantity_positive CHECK (quantity > 0);
ALTER TABLE public.orders ADD CONSTRAINT orders_charge_nonneg CHECK (charge >= 0);
ALTER TABLE public.services ADD CONSTRAINT services_price_nonneg CHECK (price >= 0);
ALTER TABLE public.services ADD CONSTRAINT services_min_max CHECK (minimum <= maximum);
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_amount_nonzero CHECK (amount != 0);
ALTER TABLE public.affiliates ADD CONSTRAINT affiliates_commission_nonneg CHECK (commission >= 0);
ALTER TABLE public.affiliates ADD CONSTRAINT affiliates_clicks_nonneg CHECK (clicks >= 0);
ALTER TABLE public.affiliates ADD CONSTRAINT affiliates_conversions_nonneg CHECK (conversions >= 0);

-- ============ Fix process_deposit: add ownership check ============
CREATE OR REPLACE FUNCTION public.process_deposit(p_deposit_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deposit RECORD;
  v_balance_before numeric(18,2);
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN RETURN jsonb_build_object('success', false, 'message', 'Not authenticated'); END IF;

  SELECT * INTO v_deposit FROM public.deposits WHERE id = p_deposit_id AND status = 'PENDING' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Deposit not found or already processed'); END IF;

  -- Ownership check: only the deposit owner can confirm their deposit
  IF v_deposit.user_id != v_caller THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
  END IF;

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

-- ============ Add admin-gated RPCs ============
-- Admin functions that check role before returning data

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN')
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_fetch_users(
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  username text,
  email text,
  balance numeric,
  role text,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  RETURN QUERY
  SELECT p.id, p.username, p.email, p.balance, p.role, p.status, p.created_at
  FROM public.profiles p
  ORDER BY p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_fetch_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_revenue numeric(18,2) := 0;
  v_total_users int := 0;
  v_total_orders int := 0;
  v_completed int := 0;
  v_pending int := 0;
  v_failed int := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  SELECT count(*), coalesce(sum(charge), 0) INTO v_total_orders, v_total_revenue FROM public.orders;
  SELECT count(*) INTO v_completed FROM public.orders WHERE status = 'COMPLETED';
  SELECT count(*) INTO v_pending FROM public.orders WHERE status IN ('PENDING', 'PROCESSING');
  SELECT count(*) INTO v_failed FROM public.orders WHERE status = 'FAILED';
  SELECT count(*) INTO v_total_users FROM public.profiles;

  RETURN jsonb_build_object(
    'totalRevenue', v_total_revenue,
    'totalUsers', v_total_users,
    'totalOrders', v_total_orders,
    'completedOrders', v_completed,
    'pendingOrders', v_pending,
    'failedOrders', v_failed
  );
END;
$$;

-- ============ Fix create_order: add link validation ============
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

  IF p_link IS NULL OR p_link = '' OR p_link !~ '^https?://' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Link không hợp lệ');
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Số lượng không hợp lệ');
  END IF;

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

-- ============ Add wallet_stats RPC for bounded aggregation ============
CREATE OR REPLACE FUNCTION public.get_wallet_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_deposited numeric(18,2) := 0;
  v_spent numeric(18,2) := 0;
  v_refunded numeric(18,2) := 0;
  v_commission numeric(18,2) := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('deposited', 0, 'spent', 0, 'refunded', 0, 'commission', 0);
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN type IN ('DEPOSIT', 'BONUS') THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'ORDER' THEN ABS(amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'REFUND' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'COMMISSION' THEN amount ELSE 0 END), 0)
  INTO v_deposited, v_spent, v_refunded, v_commission
  FROM public.wallet_transactions
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'deposited', v_deposited,
    'spent', v_spent,
    'refunded', v_refunded,
    'commission', v_commission
  );
END;
$$;
