-- Admin RPCs are no longer exposed to browser roles. The admin-rpc Edge Function
-- authenticates the caller and executes these functions with service_role.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS fn
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND (p.proname LIKE 'admin\_%' ESCAPE '\\' OR p.proname='process_deposit')
  LOOP
    EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || r.fn || ' FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION ' || r.fn || ' TO service_role';
  END LOOP;
END $$;
