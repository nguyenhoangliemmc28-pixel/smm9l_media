-- ============ Provider sync RPCs ============

-- admin_import_provider_services: imports services from a provider's API into the services table
-- Called by the provider edge function after fetching the service list
CREATE OR REPLACE FUNCTION admin_import_provider_services(p_provider_id uuid, p_services jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_admin boolean;
  v_cat_id uuid;
  v_svc jsonb;
  v_count integer := 0;
  v_existing uuid;
BEGIN
  SELECT is_admin() INTO v_is_admin;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Permission denied'; END IF;

  -- Ensure a default category exists for imports
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'imported' LIMIT 1;
  IF v_cat_id IS NULL THEN
    INSERT INTO categories (name, slug, sort_order, status)
    VALUES ('Imported', 'imported', 999, true)
    RETURNING id INTO v_cat_id;
  END IF;

  FOR v_svc IN SELECT * FROM jsonb_array_elements(p_services)
  LOOP
    SELECT id INTO v_existing FROM services WHERE provider_id = p_provider_id::text AND provider_service_id = v_svc->>'service';
    IF v_existing IS NULL THEN
      INSERT INTO services (
        category_id, provider_id, provider_service_id, name, description, type,
        price, cost, profit, minimum, maximum, refill, cancel,
        average_time, estimated_time, average_speed,
        featured, status, visibility, sort_order, api_type, tags
      ) VALUES (
        v_cat_id,
        p_provider_id::text,
        v_svc->>'service',
        v_svc->>'name',
        COALESCE(v_svc->>'description', ''),
        COALESCE(v_svc->>'type', 'default'),
        COALESCE((v_svc->>'rate')::numeric, 0),
        COALESCE((v_svc->>'rate')::numeric, 0),
        0,
        COALESCE((v_svc->>'min')::integer, 1),
        COALESCE((v_svc->>'max')::integer, 10000),
        COALESCE((v_svc->>'refill')::boolean, false),
        COALESCE((v_svc->>'cancel')::boolean, false),
        COALESCE(v_svc->>'average_time', ''),
        COALESCE(v_svc->>'estimated_time', ''),
        COALESCE(v_svc->>'average_speed', ''),
        false,
        true,
        true,
        0,
        COALESCE(v_svc->>'api_type', 'standard'),
        ARRAY[]::text[]
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  -- Log the action
  INSERT INTO admin_logs (admin_id, action, entity, entity_id, details)
  VALUES (auth.uid(), 'IMPORT_SERVICES', 'provider', p_provider_id, jsonb_build_object('count', v_count));

  RETURN jsonb_build_object('success', true, 'imported', v_count);
END;
$$;

-- admin_sync_provider_prices: updates prices for existing services from provider API data
CREATE OR REPLACE FUNCTION admin_sync_provider_prices(p_provider_id uuid, p_prices jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_admin boolean;
  v_svc jsonb;
  v_count integer := 0;
BEGIN
  SELECT is_admin() INTO v_is_admin;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Permission denied'; END IF;

  FOR v_svc IN SELECT * FROM jsonb_array_elements(p_prices)
  LOOP
    UPDATE services
    SET cost = COALESCE((v_svc->>'rate')::numeric, cost),
        price = COALESCE((v_svc->>'rate')::numeric, price),
        profit = price - cost,
        minimum = COALESCE((v_svc->>'min')::integer, minimum),
        maximum = COALESCE((v_svc->>'max')::integer, maximum),
        updated_at = now()
    WHERE provider_id = p_provider_id::text AND provider_service_id = v_svc->>'service';
    v_count := v_count + 1;
  END LOOP;

  INSERT INTO admin_logs (admin_id, action, entity, entity_id, details)
  VALUES (auth.uid(), 'SYNC_PRICES', 'provider', p_provider_id, jsonb_build_object('count', v_count));

  RETURN jsonb_build_object('success', true, 'synced', v_count);
END;
$$;

-- update_order_from_provider: updates order status from provider sync
CREATE OR REPLACE FUNCTION update_order_from_provider(p_order_id uuid, p_status text, p_start_count integer DEFAULT NULL, p_current_count integer DEFAULT NULL, p_remains integer DEFAULT NULL, p_provider_order_id text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
  v_user_id uuid;
  v_balance numeric;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  v_user_id := v_order.user_id;

  UPDATE orders SET
    status = p_status,
    start_count = COALESCE(p_start_count, start_count),
    current_count = COALESCE(p_current_count, current_count),
    remains = COALESCE(p_remains, remains),
    provider_order_id = COALESCE(p_provider_order_id, provider_order_id),
    updated_at = now(),
    completed_at = CASE WHEN p_status IN ('COMPLETED','PARTIAL','CANCELED','REFUNDED') THEN now() ELSE completed_at END
  WHERE id = p_order_id;

  -- If order failed/canceled and not already refunded, refund the user
  IF p_status IN ('CANCELED','FAILED') AND v_order.status NOT IN ('CANCELED','FAILED','REFUNDED') THEN
    SELECT balance INTO v_balance FROM profiles WHERE id = v_user_id FOR UPDATE;
    UPDATE profiles SET balance = balance + v_order.charge WHERE id = v_user_id;
    INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, description, reference_id)
    VALUES (v_user_id, 'REFUND', v_order.charge, v_balance, v_balance + v_order.charge, 'Hoàn tiền đơn ' || p_order_id, p_order_id::text);
    UPDATE orders SET status = 'REFUNDED' WHERE id = p_order_id;
  END IF;

  -- Notify user
  INSERT INTO notifications (user_id, title, content, type)
  VALUES (v_user_id, 'Cập nhật đơn hàng', 'Đơn hàng ' || p_order_id || ' đã chuyển sang: ' || p_status, 'ORDER');

  RETURN jsonb_build_object('success', true);
END;
$$;

-- set_order_provider_id: stores the provider's order ID after placing order with provider
CREATE OR REPLACE FUNCTION set_order_provider_id(p_order_id uuid, p_provider_order_id text, p_cost numeric DEFAULT 0)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE orders SET
    provider_order_id = p_provider_order_id,
    cost = p_cost,
    profit = charge - p_cost,
    status = 'PROCESSING',
    updated_at = now()
  WHERE id = p_order_id;
END;
$$;

-- validate_api_key: checks if an API key is valid, returns user_id
CREATE OR REPLACE FUNCTION validate_api_key(p_key text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT user_id INTO v_user_id FROM api_keys WHERE key = p_key AND status = 'ACTIVE';
  IF v_user_id IS NULL THEN RETURN NULL; END IF;
  UPDATE api_keys SET last_used_at = now() WHERE key = p_key;
  RETURN v_user_id;
END;
$$;

-- Revoke and grant
REVOKE ALL ON FUNCTION admin_import_provider_services FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_import_provider_services TO authenticated;

REVOKE ALL ON FUNCTION admin_sync_provider_prices FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_sync_provider_prices TO authenticated;

REVOKE ALL ON FUNCTION update_order_from_provider FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION update_order_from_provider TO authenticated;

REVOKE ALL ON FUNCTION set_order_provider_id FROM PUBLIC, anon, authenticated;
-- Called by edge function with service role, no grant needed

REVOKE ALL ON FUNCTION validate_api_key FROM PUBLIC, anon, authenticated;
-- Called by edge function with service role, no grant needed
