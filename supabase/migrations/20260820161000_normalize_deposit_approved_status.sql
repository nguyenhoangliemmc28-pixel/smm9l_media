-- Normalize deposit approval status to COMPLETED across customer/admin views.
create or replace function public.admin_process_deposit(p_deposit_id uuid, p_approve boolean, p_note text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare d public.deposits%rowtype; u public.profiles%rowtype; before_balance numeric;
begin
  if not public.is_admin() then return jsonb_build_object('success',false,'message','Admin access required'); end if;
  select * into d from public.deposits where id=p_deposit_id for update;
  if not found then return jsonb_build_object('success',false,'message','Deposit not found'); end if;
  if d.status <> 'PENDING' then return jsonb_build_object('success',false,'message','Deposit already processed'); end if;
  if not p_approve then
    update public.deposits set status='REJECTED',updated_at=now() where id=d.id;
    insert into public.admin_logs(admin_id,action,entity,entity_id,details) values(auth.uid(),'REJECT_DEPOSIT','deposits',d.id::text,jsonb_build_object('note',p_note));
    return jsonb_build_object('success',true,'status','REJECTED');
  end if;
  select * into u from public.profiles where id=d.user_id for update;
  if not found then return jsonb_build_object('success',false,'message','User profile not found'); end if;
  before_balance:=u.balance;
  update public.profiles set balance=balance+d.amount,updated_at=now() where id=d.user_id;
  insert into public.wallet_transactions(user_id,type,amount,balance_before,balance_after,description,reference_id)
  values(d.user_id,'DEPOSIT',d.amount,before_balance,before_balance+d.amount,'Nạp tiền '||d.txn_code,d.id::text);
  update public.deposits set status='COMPLETED',updated_at=now() where id=d.id;
  insert into public.notifications(user_id,title,content,type) values(d.user_id,'Nạp tiền thành công','Nạp '||d.amount::text||' VND đã được cộng vào số dư.','PAYMENT');
  insert into public.admin_logs(admin_id,action,entity,entity_id,details) values(auth.uid(),'APPROVE_DEPOSIT','deposits',d.id::text,jsonb_build_object('amount',d.amount,'note',p_note));
  return jsonb_build_object('success',true,'status','COMPLETED','amount',d.amount);
end; $$;
revoke all on function public.admin_process_deposit(uuid,boolean,text) from public,anon;
grant execute on function public.admin_process_deposit(uuid,boolean,text) to authenticated,service_role;
