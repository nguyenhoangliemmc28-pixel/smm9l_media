-- P0 money-path hardening applied to production.
drop policy if exists deposits_insert_own on public.deposits;
drop policy if exists orders_insert_own on public.orders;
revoke insert, update, delete on public.deposits from anon, authenticated;
revoke insert, update, delete on public.orders from anon, authenticated;
revoke insert, update, delete on public.wallet_transactions from anon, authenticated;
revoke insert, update, delete on public.order_refunds from anon, authenticated;
revoke execute on function public.set_order_provider_id(uuid,text,numeric) from public, anon, authenticated;
grant execute on function public.set_order_provider_id(uuid,text,numeric) to service_role;
revoke execute on function public.claim_order_queue(integer) from public, anon, authenticated;
revoke execute on function public.claim_order_queue_jobs(integer) from public, anon, authenticated;
revoke execute on function public.complete_order_queue_job(uuid,text) from public, anon, authenticated;
revoke execute on function public.fail_order_queue_job(uuid,text) from public, anon, authenticated;
grant execute on function public.claim_order_queue(integer) to service_role;
grant execute on function public.claim_order_queue_jobs(integer) to service_role;
grant execute on function public.complete_order_queue_job(uuid,text) to service_role;
grant execute on function public.fail_order_queue_job(uuid,text) to service_role;
create unique index if not exists deposits_txn_code_unique on public.deposits(txn_code);

create or replace function public.create_deposit_request(p_bank text,p_amount numeric)
returns jsonb language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); dep_id uuid; code text; min_amount numeric:=0; max_amount numeric:=999999999999;
begin
  if u is null then return jsonb_build_object('success',false,'message','Chưa đăng nhập'); end if;
  select coalesce(nullif(value,'')::numeric,0) into min_amount from public.settings where key='deposit_min';
  select coalesce(nullif(value,'')::numeric,999999999999) into max_amount from public.settings where key='deposit_max';
  if p_amount is null or p_amount < greatest(1,min_amount) or p_amount > max_amount then return jsonb_build_object('success',false,'message','Số tiền nạp không hợp lệ'); end if;
  if p_bank is null or length(trim(p_bank))=0 then return jsonb_build_object('success',false,'message','Thiếu ngân hàng'); end if;
  code := 'DEP' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  insert into public.deposits(user_id,txn_code,bank,amount,status) values(u,code,left(trim(p_bank),100),round(p_amount,2),'PENDING') returning id into dep_id;
  return jsonb_build_object('success',true,'deposit_id',dep_id,'txn_code',code,'status','PENDING');
end $$;
revoke execute on function public.create_deposit_request(text,numeric) from public, anon;
grant execute on function public.create_deposit_request(text,numeric) to authenticated;

create or replace function public.fail_order_queue_job(p_job_id uuid,p_error text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare q public.order_queue%rowtype; dead boolean; r jsonb;
begin
  select * into q from public.order_queue where id=p_job_id for update;
  if not found then return jsonb_build_object('success',false,'message','Queue job not found'); end if;
  dead := q.attempts >= q.max_attempts;
  if dead then
    update public.order_queue set status='DEAD',locked_at=null,last_error=left(p_error,1000),next_attempt_at=now(),updated_at=now() where id=p_job_id;
    r := public.apply_provider_status(q.order_id,'FAILED',null,null,null,null);
  else
    update public.order_queue set status='FAILED',locked_at=null,last_error=left(p_error,1000),next_attempt_at=now()+interval '60 seconds',updated_at=now() where id=p_job_id;
    r := jsonb_build_object('refunded',0);
  end if;
  return jsonb_build_object('success',true,'dead',dead,'refund',coalesce(r->'refund','0'::jsonb));
end $$;
revoke execute on function public.fail_order_queue_job(uuid,text) from public,anon,authenticated;
grant execute on function public.fail_order_queue_job(uuid,text) to service_role;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_balance_nonnegative') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_balance_nonnegative CHECK (balance >= 0);
  END IF;
END $$;
