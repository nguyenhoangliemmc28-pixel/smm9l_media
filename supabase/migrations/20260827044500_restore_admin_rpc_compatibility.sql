-- Compatibility rollback for the browser-facing admin RPCs.
-- Every admin function remains database-authorized; removing EXECUTE here would
-- break the existing admin client until all actor identity/audit propagation is
-- migrated to a trusted server-side command path.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS fn
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND (p.proname LIKE 'admin\_%' ESCAPE '\\' OR p.proname='process_deposit')
  LOOP
    EXECUTE 'GRANT EXECUTE ON FUNCTION ' || r.fn || ' TO authenticated';
  END LOOP;
END $$;
