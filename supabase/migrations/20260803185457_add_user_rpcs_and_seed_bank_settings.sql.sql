-- ============ Seed bank settings ============
INSERT INTO settings (key, value) VALUES
  ('bank_name', '"MB Bank"'::jsonb),
  ('bank_account', '"0987654321"'::jsonb),
  ('bank_holder', '"CONG TY BOOSTHUB"'::jsonb),
  ('deposit_min', '10000'::jsonb),
  ('deposit_max', '50000000'::jsonb),
  ('withdraw_min', '50000'::jsonb),
  ('withdraw_fee', '0'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============ request_withdraw ============
-- Deducts balance immediately, creates PENDING withdrawal row, logs wallet tx.
-- Admin approves/rejects via admin_process_withdrawal (already exists).
CREATE OR REPLACE FUNCTION request_withdraw(p_amount numeric, p_bank text, p_account_number text, p_account_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_balance numeric;
  v_wid uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  SELECT balance INTO v_balance FROM profiles WHERE id = v_user FOR UPDATE;
  IF v_balance IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;
  IF v_balance < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  INSERT INTO withdrawals (user_id, amount, bank, account_number, account_name, status)
  VALUES (v_user, p_amount, p_bank, p_account_number, p_account_name, 'PENDING')
  RETURNING id INTO v_wid;

  UPDATE profiles SET balance = balance - p_amount, updated_at = now() WHERE id = v_user;

  INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, description, reference_id)
  VALUES (v_user, 'WITHDRAW', -p_amount, v_balance, v_balance - p_amount, 'Yêu cầu rút tiền', v_wid::text);

  RETURN jsonb_build_object('success', true, 'id', v_wid);
END;
$$;

-- ============ refill_order ============
-- Only works if order is COMPLETED and service.refill = true.
-- Sets refill_status to 'PENDING'.
CREATE OR REPLACE FUNCTION refill_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_order RECORD;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT o.*, s.refill as svc_refill INTO v_order
  FROM orders o
  JOIN services s ON s.id = o.service_id
  WHERE o.id = p_order_id AND o.user_id = v_user AND o.deleted_at IS NULL;

  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.svc_refill = false THEN RAISE EXCEPTION 'Service does not support refill'; END IF;
  IF v_order.status NOT IN ('COMPLETED', 'PARTIAL') THEN RAISE EXCEPTION 'Order must be completed'; END IF;
  IF v_order.refill_status = 'PENDING' THEN RAISE EXCEPTION 'Refill already requested'; END IF;

  UPDATE orders SET refill_status = 'PENDING', updated_at = now() WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============ cancel_order ============
-- Only works if order is PENDING/PROCESSING. Refunds the charge.
CREATE OR REPLACE FUNCTION cancel_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_order RECORD;
  v_balance numeric;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id AND user_id = v_user AND deleted_at IS NULL;

  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status NOT IN ('PENDING', 'PROCESSING') THEN RAISE EXCEPTION 'Cannot cancel order in current status'; END IF;

  SELECT balance INTO v_balance FROM profiles WHERE id = v_user FOR UPDATE;

  UPDATE orders SET status = 'CANCELED', cancel_status = 'ACCEPTED', updated_at = now() WHERE id = p_order_id;

  UPDATE profiles SET balance = balance + v_order.charge, updated_at = now() WHERE id = v_user;

  INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, description, reference_id)
  VALUES (v_user, 'REFUND', v_order.charge, v_balance, v_balance + v_order.charge, 'Hoàn tiền đơn ' || v_order.id::text, p_order_id::text);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============ fetch_dashboard_home_stats ============
-- Returns real stats for the user dashboard home page.
CREATE OR REPLACE FUNCTION fetch_dashboard_home_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_open_tickets integer;
  v_commission numeric;
  v_total_orders integer;
  v_completed_orders integer;
  v_pending_orders integer;
  v_platform_stats jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT count(*) INTO v_open_tickets
  FROM tickets WHERE user_id = v_user AND status = 'OPEN';

  SELECT COALESCE(total_commission, 0) INTO v_commission
  FROM affiliates WHERE user_id = v_user;

  SELECT count(*), count(*) FILTER (WHERE status = 'COMPLETED'), count(*) FILTER (WHERE status IN ('PENDING','PROCESSING'))
  INTO v_total_orders, v_completed_orders, v_pending_orders
  FROM orders WHERE user_id = v_user AND deleted_at IS NULL;

  -- Platform distribution from real orders
  SELECT COALESCE(jsonb_object_agg(c.name, cnt), '{}'::jsonb) INTO v_platform_stats
  FROM (
    SELECT c.name, count(*) as cnt
    FROM orders o
    JOIN services s ON s.id = o.service_id
    JOIN categories c ON c.id = s.category_id
    WHERE o.user_id = v_user AND o.deleted_at IS NULL
    GROUP BY c.name
  ) sub;

  RETURN jsonb_build_object(
    'open_tickets', v_open_tickets,
    'commission', v_commission,
    'total_orders', v_total_orders,
    'completed_orders', v_completed_orders,
    'pending_orders', v_pending_orders,
    'platform_stats', v_platform_stats
  );
END;
$$;

-- ============ save_notification_prefs ============
-- Saves user notification preferences to profiles.notification_prefs (jsonb column).
-- If column doesn't exist, we add it.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_prefs jsonb DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION save_notification_prefs(p_prefs jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE profiles SET notification_prefs = p_prefs, updated_at = now() WHERE id = v_user;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============ fetch_notification_prefs ============
CREATE OR REPLACE FUNCTION fetch_notification_prefs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_prefs jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT COALESCE(notification_prefs, '{}'::jsonb) INTO v_prefs FROM profiles WHERE id = v_user;
  RETURN v_prefs;
END;
$$;

-- Revoke and grant
REVOKE ALL ON FUNCTION request_withdraw FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION request_withdraw TO authenticated;

REVOKE ALL ON FUNCTION refill_order FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION refill_order TO authenticated;

REVOKE ALL ON FUNCTION cancel_order FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION cancel_order TO authenticated;

REVOKE ALL ON FUNCTION fetch_dashboard_home_stats FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION fetch_dashboard_home_stats TO authenticated;

REVOKE ALL ON FUNCTION save_notification_prefs FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION save_notification_prefs TO authenticated;

REVOKE ALL ON FUNCTION fetch_notification_prefs FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION fetch_notification_prefs TO authenticated;
