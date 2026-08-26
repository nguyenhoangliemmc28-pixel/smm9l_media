CREATE OR REPLACE FUNCTION public.admin_fetch_logs(p_limit integer DEFAULT 100,p_offset integer DEFAULT 0)
RETURNS TABLE(id uuid,admin_id uuid,admin_name text,action text,entity text,entity_id text,details jsonb,created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role IN ('ADMIN','SUPER_ADMIN')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
  SELECT l.id,l.admin_id,p.username,l.action,l.entity,l.entity_id,l.details,l.created_at
  FROM public.admin_logs l
  LEFT JOIN public.profiles p ON p.id=l.admin_id
  ORDER BY l.created_at DESC
  LIMIT greatest(1,least(coalesce(p_limit,100),500))
  OFFSET greatest(0,coalesce(p_offset,0));
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_fetch_logs(integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_fetch_logs(integer,integer) TO authenticated;
