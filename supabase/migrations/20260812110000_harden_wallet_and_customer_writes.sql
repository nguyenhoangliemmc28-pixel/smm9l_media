/* 9L Media production hardening. Applied to Supabase production on 2026-08-12. */
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.role := OLD.role;
    NEW.balance := OLD.balance;
    NEW.status := OLD.status;
    NEW.email_verified := OLD.email_verified;
    NEW.api_key := OLD.api_key;
    NEW.referred_by := OLD.referred_by;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_profile_privileged_fields ON public.profiles;
CREATE TRIGGER protect_profile_privileged_fields BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_fields();

DROP POLICY IF EXISTS "deposits_update_own" ON public.deposits;
DROP POLICY IF EXISTS "orders_update_own" ON public.orders;
DROP POLICY IF EXISTS "orders_delete_own" ON public.orders;
DROP POLICY IF EXISTS "wallet_insert_own" ON public.wallet_transactions;
DROP POLICY IF EXISTS "tickets_update_own" ON public.tickets;
DROP POLICY IF EXISTS "withdrawals_update_own" ON public.withdrawals;

CREATE OR REPLACE FUNCTION public.create_deposit_request(p_bank text, p_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid := auth.uid(); dep_id uuid; code text;
BEGIN
  IF u IS NULL THEN RETURN jsonb_build_object('success',false,'message','Chưa đăng nhập'); END IF;
  IF p_amount <= 0 THEN RETURN jsonb_build_object('success',false,'message','Số tiền không hợp lệ'); END IF;
  code := 'DEP' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  INSERT INTO public.deposits(user_id,txn_code,bank,amount,status) VALUES(u,code,p_bank,p_amount,'PENDING') RETURNING id INTO dep_id;
  RETURN jsonb_build_object('success',true,'deposit_id',dep_id,'txn_code',code,'status','PENDING');
END; $$;

CREATE OR REPLACE FUNCTION public.process_deposit(p_deposit_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.deposits%rowtype; u public.profiles%rowtype; before_balance numeric;
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('success',false,'message','Admin access required'); END IF;
  SELECT * INTO d FROM public.deposits WHERE id=p_deposit_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'message','Deposit not found'); END IF;
  IF d.status <> 'PENDING' THEN RETURN jsonb_build_object('success',false,'message','Deposit already processed'); END IF;
  SELECT * INTO u FROM public.profiles WHERE id=d.user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'message','User profile not found'); END IF;
  before_balance := u.balance;
  UPDATE public.profiles SET balance=balance+d.amount, updated_at=now() WHERE id=d.user_id;
  INSERT INTO public.wallet_transactions(user_id,type,amount,balance_before,balance_after,description,reference_id) VALUES(d.user_id,'DEPOSIT',d.amount,before_balance,before_balance+d.amount,'Nạp tiền '||d.txn_code,d.id::text);
  UPDATE public.deposits SET status='COMPLETED', updated_at=now() WHERE id=d.id;
  INSERT INTO public.notifications(user_id,title,content,type) VALUES(d.user_id,'Nạp tiền thành công','Nạp tiền đã được duyệt và cộng vào số dư.','PAYMENT');
  INSERT INTO public.admin_logs(admin_id,action,entity,entity_id,details) VALUES(auth.uid(),'APPROVE_DEPOSIT','deposits',d.id::text,jsonb_build_object('amount',d.amount));
  RETURN jsonb_build_object('success',true,'status','COMPLETED','amount',d.amount);
END; $$;
REVOKE ALL ON FUNCTION public.process_deposit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_deposit(uuid) TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_services_provider_mapping ON public.services(provider_id,provider_service_id) WHERE provider_id IS NOT NULL AND provider_service_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_provider_status ON public.orders(provider_id,provider_order_id,status) WHERE provider_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_queue_ready ON public.order_queue(status,next_attempt_at) WHERE status IN ('QUEUED','RETRY');
