CREATE OR REPLACE FUNCTION public.admin_update_provider(p_id uuid, p_name text, p_api_url text, p_api_key text, p_status text, p_description text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF nullif(trim(p_name), '') IS NULL OR nullif(trim(p_api_url), '') IS NULL THEN
    RAISE EXCEPTION 'Provider name and API URL are required';
  END IF;

  UPDATE public.providers
  SET
    name = trim(p_name),
    api_url = trim(p_api_url),
    api_key = CASE
      WHEN nullif(trim(coalesce(p_api_key, '')), '') IS NULL THEN api_key
      ELSE trim(p_api_key)
    END,
    status = CASE WHEN p_status IN ('ACTIVE', 'INACTIVE') THEN p_status ELSE status END,
    description = coalesce(p_description, ''),
    updated_at = now()
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Provider not found';
  END IF;
END;
$function$;
