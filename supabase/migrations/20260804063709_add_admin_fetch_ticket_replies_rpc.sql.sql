-- ============ admin_fetch_ticket_replies ============
CREATE OR REPLACE FUNCTION admin_fetch_ticket_replies(p_ticket_id uuid)
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
    'id', r.id,
    'ticket_id', r.ticket_id,
    'user_id', r.user_id,
    'admin_id', r.admin_id,
    'message', r.message,
    'attachments', r.attachments,
    'created_at', r.created_at
  ) ORDER BY r.created_at), '[]'::jsonb) INTO v_result
  FROM ticket_replies r
  WHERE r.ticket_id = p_ticket_id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION admin_fetch_ticket_replies FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_fetch_ticket_replies TO authenticated;
