/*
# Fix infinite recursion in profiles RLS policies

## Problem
The `profiles_admin_all` policy used a subquery against `profiles` itself:
  EXISTS (SELECT 1 FROM profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('SUPER_ADMIN','ADMIN'))
When PostgreSQL evaluates RLS on `profiles`, it hits this policy, which queries
`profiles` again, triggering RLS again — infinite recursion. The error:
  ERROR: 42P17: infinite recursion detected in policy for relation "profiles"
This caused `loadProfile()` in the frontend to fail silently, leaving `profile`
as `null`, so `AdminRoute` always showed "Access Denied" — even for a valid
SUPER_ADMIN user.

## Fix
1. Drop the self-referencing `profiles_admin_all` policy.
2. Recreate it using the `is_admin()` SECURITY DEFINER function instead.
   `is_admin()` is `SECURITY DEFINER` with `search_path = public`, so it runs
   as the owner and bypasses RLS — no recursion.
3. Keep all other profiles policies unchanged (profiles_select_own,
   profiles_update_own, profiles_update_admin).

## Security
- RBAC remains fully intact.
- No new privileges are granted.
- The admin check is still enforced — it just no longer recurses.
*/

DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;

CREATE POLICY "profiles_admin_all"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
