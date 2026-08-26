# Security & Release Status

This document records the production hardening work performed against the connected Supabase project and repository.

## Database hardening completed
- Client direct writes to financial tables revoked.
- Client cannot directly update profile balance/role/status/security fields.
- Admin RPC execute permissions restricted; privileged functions must enforce admin authorization in the database.
- Order queue insertion restricted to authenticated owners through the enqueue RPC.
- Withdrawal flow validates input, locks the user profile row, deducts funds atomically, and records a wallet transaction.
- Refund flow calculates only the remaining refundable amount under a locked order and records the refund and wallet transaction together.
- Financial integrity constraints validated.
- Sensitive tables such as system secrets and admin logs have no client write grants.
- Missing indexes for selected foreign keys added.
- Duplicate deposit index removed.

## Release gates still requiring verification
- GitHub CI must pass typecheck, lint and build.
- Provider API / order worker / order sync must be exercised end-to-end.
- Production Vercel deployment must be verified.
- Supabase Auth leaked-password protection should be enabled after confirming the desired Auth policy.
- Security Advisor warnings should be rechecked after cache refresh.

Do not treat this file as a substitute for a successful production smoke test.
