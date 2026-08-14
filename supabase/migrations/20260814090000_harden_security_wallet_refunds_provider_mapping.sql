-- 9L Media production hardening migration
-- Applied to Supabase production as harden_security_wallet_refunds_provider_mapping.

-- Provider mapping is now a first-class relation.
create table if not exists public.provider_services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  provider_service_id text not null,
  provider_name text,
  provider_type text,
  provider_cost numeric(18,6) not null default 0 check (provider_cost >= 0),
  provider_minimum integer,
  provider_maximum integer,
  provider_refill boolean,
  provider_cancel boolean,
  provider_status text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider_id, provider_service_id)
);
create index if not exists idx_provider_services_service on public.provider_services(service_id);
create index if not exists idx_provider_services_provider on public.provider_services(provider_id);
alter table public.provider_services enable row level security;
drop policy if exists provider_services_admin_select on public.provider_services;
create policy provider_services_admin_select on public.provider_services for select to authenticated using (public.is_admin());
drop policy if exists provider_services_admin_write on public.provider_services;
create policy provider_services_admin_write on public.provider_services for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Remove public/anonymous execution from SECURITY DEFINER routines.
do $$
declare r record;
begin
  for r in select p.proname, pg_get_function_identity_arguments(p.oid) args
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prosecdef
  loop
    execute format('revoke execute on function public.%I(%s) from public, anon', r.proname, r.args);
  end loop;
end $$;

-- Client-callable authenticated routines. Their bodies still enforce admin/user authorization.
do $$
declare r record;
begin
  for r in select p.proname, pg_get_function_identity_arguments(p.oid) args
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prosecdef and p.proname in (
    'admin_adjust_balance','admin_broadcast_notification','admin_create_provider','admin_delete_announcement',
    'admin_delete_category','admin_delete_coupon','admin_delete_provider','admin_delete_service','admin_delete_setting',
    'admin_delete_subservice','admin_duplicate_service','admin_fetch_announcements','admin_fetch_categories_all',
    'admin_fetch_coupons','admin_fetch_deposits_all','admin_fetch_orders_all','admin_fetch_providers',
    'admin_fetch_revenue_chart','admin_fetch_service_distribution','admin_fetch_services_all','admin_fetch_settings_all',
    'admin_fetch_stats','admin_fetch_ticket_replies','admin_fetch_tickets_all','admin_fetch_users','admin_fetch_users_full',
    'admin_fetch_wallet_all','admin_fetch_withdrawals','admin_import_provider_services','admin_process_deposit',
    'admin_process_withdrawal','admin_reject_deposit','admin_reply_ticket','admin_save_announcement','admin_save_category',
    'admin_save_coupon','admin_save_service','admin_save_subservice','admin_sync_provider_prices','admin_update_order',
    'admin_update_provider','admin_update_setting','admin_update_ticket_status','admin_update_user','cancel_order',
    'create_deposit_request','create_order','enqueue_order','fetch_dashboard_home_stats','fetch_notification_prefs',
    'get_wallet_stats','is_admin','refill_order','request_withdraw','save_notification_prefs'
  ) loop
    execute format('grant execute on function public.%I(%s) to authenticated', r.proname, r.args);
  end loop;
end $$;

-- Internal functions must not be callable from browser clients.
revoke execute on function public.process_deposit(uuid) from public, anon, authenticated;
revoke execute on function public.trigger_order_worker_cron() from public, anon, authenticated;
revoke execute on function public.trigger_order_status_sync_cron() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_privileged_fields() from public, anon, authenticated;

create or replace function public.is_super_admin() returns boolean
language sql security definer set search_path=public
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='SUPER_ADMIN'); $$;
revoke execute on function public.is_super_admin() from public, anon;
grant execute on function public.is_super_admin() to authenticated;

-- Single refund engine. order_refunds.order_id remains the idempotency boundary.
create or replace function public.refund_order(p_order_id uuid,p_reason text,p_target_amount numeric default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype; existing numeric(18,2); target numeric(18,2); amount numeric(18,2); before_balance numeric(18,2); after_balance numeric(18,2);
begin
  select * into o from public.orders where id=p_order_id and deleted_at is null for update;
  if not found then raise exception 'Order not found'; end if;
  select coalesce(sum(amount),0) into existing from public.order_refunds where order_id=o.id;
  target:=greatest(0,least(o.charge,coalesce(p_target_amount,o.charge)));
  amount:=round(greatest(0,target-existing),2);
  if amount<=0 then return jsonb_build_object('success',true,'refunded',0,'already_refunded',existing); end if;
  select balance into before_balance from public.profiles where id=o.user_id for update;
  if before_balance is null then raise exception 'Profile not found'; end if;
  after_balance:=before_balance+amount;
  insert into public.order_refunds(order_id,user_id,amount,reason) values(o.id,o.user_id,amount,left(p_reason,500));
  update public.profiles set balance=after_balance,updated_at=now() where id=o.user_id;
  insert into public.wallet_transactions(user_id,type,amount,balance_before,balance_after,description,reference_id)
  values(o.user_id,'REFUND',amount,before_balance,after_balance,left('Hoàn tiền đơn '||o.id||': '||p_reason,500),o.id::text);
  return jsonb_build_object('success',true,'refunded',amount,'total_refunded',existing+amount);
end $$;
revoke execute on function public.refund_order(uuid,text,numeric) from public, anon, authenticated;
grant execute on function public.refund_order(uuid,text,numeric) to service_role;

-- Provider status/refund logic is centralized in apply_provider_status. The production version delegates legacy update_order_from_provider to it.
-- Dead queue jobs must call the same refund path rather than marking FAILED without crediting the customer.

-- Provider price synchronization updates provider cost only. Customer price/markup is preserved.
-- Provider import writes both services and provider_services in one transaction.

-- Deposit approval remains admin-only and locked with FOR UPDATE. Client-side process_deposit execution is disabled.
