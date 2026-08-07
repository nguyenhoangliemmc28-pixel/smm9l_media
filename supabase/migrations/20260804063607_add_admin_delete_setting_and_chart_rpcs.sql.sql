-- ============ admin_delete_setting ============
CREATE OR REPLACE FUNCTION admin_delete_setting(p_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin uuid := auth.uid();
BEGIN
  IF v_admin IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  DELETE FROM settings WHERE key = p_key;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Setting not found'); END IF;

  INSERT INTO admin_logs (admin_id, action, entity, entity_id, details)
  VALUES (v_admin, 'DELETE_SETTING', 'setting', p_key, jsonb_build_object('key', p_key));

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION admin_delete_setting FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_setting TO authenticated;

-- ============ admin_fetch_revenue_chart ============
-- Returns daily revenue for the last 30 days
CREATE OR REPLACE FUNCTION admin_fetch_revenue_chart()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_admin IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'date', d::text,
    'revenue', COALESCE(rev, 0),
    'orders', COALESCE(cnt, 0)
  ) ORDER BY d), '[]'::jsonb) INTO v_result
  FROM (
    SELECT
      d,
      (SELECT COALESCE(sum(charge), 0) FROM orders WHERE created_at >= d AND created_at < d + interval '1 day') as rev,
      (SELECT count(*) FROM orders WHERE created_at >= d AND created_at < d + interval '1 day') as cnt
    FROM generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day') as d
  ) sub;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION admin_fetch_revenue_chart FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_fetch_revenue_chart TO authenticated;

-- ============ admin_fetch_service_distribution ============
-- Returns order count per service (top 10)
CREATE OR REPLACE FUNCTION admin_fetch_service_distribution()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_admin IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'name', svc_name,
    'orders', cnt
  ) ORDER BY cnt DESC), '[]'::jsonb) INTO v_result
  FROM (
    SELECT
      COALESCE(s.name, 'Unknown') as svc_name,
      count(*) as cnt
    FROM orders o
    LEFT JOIN services s ON s.id = o.service_id
    WHERE o.deleted_at IS NULL
    GROUP BY s.name
    LIMIT 10
  ) sub;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION admin_fetch_service_distribution FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_fetch_service_distribution TO authenticated;
