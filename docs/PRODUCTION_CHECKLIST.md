# 9L Media Production Checklist

## Security
- Admin RPC authorization must be enforced in the database.
- Financial tables must not be directly writable by client roles.
- Profile financial/security columns must not be client-writable.
- Refunds must be idempotent and never exceed order charge.
- Withdrawals must reserve/deduct funds atomically.
- Orders must reserve/deduct funds atomically.
- Provider credentials/secrets must never be exposed to browser clients.

## Release gates
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Verify Vercel deployment.
- Test deposit -> approval -> balance.
- Test order -> provider -> status sync.
- Test failed order -> single refund.
- Test withdrawal -> approval/rejection.
