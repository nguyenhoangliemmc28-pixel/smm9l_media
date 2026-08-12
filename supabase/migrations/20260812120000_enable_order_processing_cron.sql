create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.system_secrets (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.system_secrets enable row level security;
drop policy if exists "system_secrets_no_client_access" on public.system_secrets;

insert into public.system_secrets(key, value)
values ('edge_cron_secret', encode(gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

create or replace function public.trigger_order_worker_cron()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_secret text;
begin
  select value into v_secret from public.system_secrets where key = 'edge_cron_secret';
  perform net.http_post(
    url := 'https://hsegoymrolpodrgqpfhj.supabase.co/functions/v1/order-worker',
    headers := jsonb_build_object('Content-Type','application/json','X-Cron-Secret',v_secret),
    body := '{"limit":50}'::jsonb
  );
end;
$$;

create or replace function public.trigger_order_status_sync_cron()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_secret text;
begin
  select value into v_secret from public.system_secrets where key = 'edge_cron_secret';
  perform net.http_post(
    url := 'https://hsegoymrolpodrgqpfhj.supabase.co/functions/v1/order-status-sync',
    headers := jsonb_build_object('Content-Type','application/json','X-Cron-Secret',v_secret),
    body := '{"limit":100}'::jsonb
  );
end;
$$;

select cron.unschedule(jobid) from cron.job where jobname in ('9l-order-worker','9l-order-status-sync');
select cron.schedule('9l-order-worker','* * * * *','select public.trigger_order_worker_cron();');
select cron.schedule('9l-order-status-sync','*/2 * * * *','select public.trigger_order_status_sync_cron();');
