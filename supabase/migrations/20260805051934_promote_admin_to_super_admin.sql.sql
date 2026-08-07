/*
# Promote admin123@gmail.com to SUPER_ADMIN

1. Purpose
   - The auth user `admin123@gmail.com` (id e87517a2-6bd4-4e27-bc04-0b66eef0d513)
     has no row in `profiles`, so `is_admin()` returns false and the admin
     panel is inaccessible.
   - This migration inserts a profile row with role = 'SUPER_ADMIN' and
     status = 'ACTIVE' so that both the `is_admin()` SQL function and the
     frontend `AdminRoute` / `RequireRole` guards recognize the account.

2. Changes
   - INSERT one row into `profiles` with:
     - id = e87517a2-6bd4-4e27-bc04-0b66eef0d513
     - username = 'admin123'
     - email = 'admin123@gmail.com'
     - role = 'SUPER_ADMIN'
     - status = 'ACTIVE'
     - email_verified = true
     - referral_code = 'ADMIN123'
   - Uses ON CONFLICT (id) DO UPDATE so it is idempotent: re-running will
     just re-assert the SUPER_ADMIN role.

3. Security
   - No RLS policy changes.
   - RBAC remains fully intact; this only sets the correct role on the
     correct user.
*/

INSERT INTO public.profiles (id, username, email, role, status, email_verified, referral_code)
VALUES (
  'e87517a2-6bd4-4e27-bc04-0b66eef0d513',
  'admin123',
  'admin123@gmail.com',
  'SUPER_ADMIN',
  'ACTIVE',
  true,
  'ADMIN123'
)
ON CONFLICT (id) DO UPDATE SET
  role = 'SUPER_ADMIN',
  status = 'ACTIVE',
  email_verified = true;
