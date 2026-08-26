-- Financial security hardening. No destructive data changes.

-- Keep direct client writes closed on money/order ledgers.
REVOKE INSERT, UPDATE, DELETE ON public.wallet_transactions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.order_refunds FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.orders FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.deposits FROM anon, authenticated;

-- Wallet ledger rows must describe a non-negative balance transition.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallet_transactions_balances_nonnegative') THEN
    ALTER TABLE public.wallet_transactions
      ADD CONSTRAINT wallet_transactions_balances_nonnegative
      CHECK (balance_before >= 0 AND balance_after >= 0);
  END IF;
END $$;

-- Admin balance changes are validated and auditable at the database boundary.
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(
  p_user_id uuid,
  p_amount numeric,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role text;
  v_before numeric;
  v_after numeric;
  v_amount numeric(18,2);
BEGIN
  SELECT role INTO v_admin_role FROM public.profiles WHERE id = auth.uid();
  IF v_admin_role NOT IN ('ADMIN','SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_user_id IS NULL OR p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'Invalid balance adjustment';
  END IF;
  IF nullif(trim(coalesce(p_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Adjustment reason is required';
  END IF;

  v_amount := round(p_amount, 2);
  SELECT balance INTO v_before FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  v_after := v_before + v_amount;
  IF v_after < 0 THEN RAISE EXCEPTION 'Balance cannot be negative'; END IF;

  UPDATE public.profiles
  SET balance = v_after, updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO public.wallet_transactions(
    user_id,type,amount,balance_before,balance_after,description,reference_id
  ) VALUES (
    p_user_id,
    CASE WHEN v_amount > 0 THEN 'BONUS' ELSE 'TRANSFER' END,
    v_amount,
    v_before,
    v_after,
    left(trim(p_reason), 500),
    'ADMIN_ADJUST:' || auth.uid()::text || ':' || gen_random_uuid()::text
  );

  INSERT INTO public.admin_logs(admin_id, action, entity, entity_id, details)
  VALUES (
    auth.uid(),
    'ADJUST_BALANCE',
    'profiles',
    p_user_id::text,
    jsonb_build_object('amount', v_amount, 'balance_before', v_before, 'balance_after', v_after, 'reason', left(trim(p_reason), 500))
  );
END;
$$;

-- Deposit rejection is serialized and becomes a no-op once terminal.
CREATE OR REPLACE FUNCTION public.admin_reject_deposit(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role text;
  d public.deposits%rowtype;
BEGIN
  SELECT role INTO v_admin_role FROM public.profiles WHERE id = auth.uid();
  IF v_admin_role NOT IN ('ADMIN','SUPER_ADMIN') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO d FROM public.deposits WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deposit not found'; END IF;
  IF d.status <> 'PENDING' THEN RETURN; END IF;
  UPDATE public.deposits SET status = 'REJECTED', updated_at = now() WHERE id = p_id;
  INSERT INTO public.admin_logs(admin_id,action,entity,entity_id,details)
  VALUES(auth.uid(),'REJECT_DEPOSIT','deposits',p_id::text,jsonb_build_object('amount',d.amount));
  INSERT INTO public.notifications(user_id,title,content,type)
  VALUES(d.user_id,'Nạp tiền bị từ chối','Yêu cầu nạp tiền '||d.txn_code||' đã bị từ chối.','PAYMENT');
END;
$$;

-- Withdrawal action accepts only explicit actions. Terminal rows are idempotent.
CREATE OR REPLACE FUNCTION public.admin_process_withdrawal(p_id uuid, p_action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role text;
  w public.withdrawals%rowtype;
  b numeric;
  v_action text := upper(trim(coalesce(p_action,'')));
BEGIN
  SELECT role INTO v_admin_role FROM public.profiles WHERE id = auth.uid();
  IF v_admin_role NOT IN ('ADMIN','SUPER_ADMIN') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF v_action NOT IN ('APPROVE','REJECT') THEN RAISE EXCEPTION 'Invalid withdrawal action'; END IF;

  SELECT * INTO w FROM public.withdrawals WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF w.status <> 'PENDING' THEN RETURN; END IF;

  IF v_action = 'APPROVE' THEN
    UPDATE public.withdrawals SET status='COMPLETED', updated_at=now() WHERE id=p_id;
    INSERT INTO public.notifications(user_id,title,content,type)
    VALUES(w.user_id,'Rút tiền đã duyệt','Yêu cầu rút '||w.amount::text||' VND đã được duyệt.','PAYMENT');
  ELSE
    SELECT balance INTO b FROM public.profiles WHERE id=w.user_id FOR UPDATE;
    IF b IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;
    UPDATE public.withdrawals SET status='REJECTED', updated_at=now() WHERE id=p_id;
    UPDATE public.profiles SET balance=balance+w.amount, updated_at=now() WHERE id=w.user_id;
    INSERT INTO public.wallet_transactions(user_id,type,amount,balance_before,balance_after,description,reference_id)
    VALUES(w.user_id,'REFUND',w.amount,b,b+w.amount,'Hoàn tiền yêu cầu rút',w.id::text);
    INSERT INTO public.notifications(user_id,title,content,type)
    VALUES(w.user_id,'Rút tiền bị từ chối','Yêu cầu rút tiền đã bị từ chối và số tiền đã được hoàn lại.','PAYMENT');
  END IF;

  INSERT INTO public.admin_logs(admin_id,action,entity,entity_id,details)
  VALUES(auth.uid(),CASE WHEN v_action='APPROVE' THEN 'APPROVE_WITHDRAWAL' ELSE 'REJECT_WITHDRAWAL' END,'withdrawals',w.id::text,jsonb_build_object('amount',w.amount));
END;
$$;

-- A user may cancel only before provider dispatch. This prevents a full refund after external fulfillment has started.
CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders%rowtype;
  result jsonb;
BEGIN
  SELECT * INTO o
  FROM public.orders
  WHERE id=p_order_id AND user_id=auth.uid() AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND OR o.status <> 'PENDING' OR o.provider_order_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot cancel order after provider dispatch';
  END IF;

  UPDATE public.orders SET status='CANCELED',cancel_status='ACCEPTED',updated_at=now() WHERE id=p_order_id;
  result := public.refund_order(p_order_id,'Khách hàng hủy đơn',o.charge);
  RETURN jsonb_build_object('success',true,'refund',result->'refunded');
END;
$$;

-- Refill creation is idempotent while an existing refill request is pending.
CREATE OR REPLACE FUNCTION public.refill_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders%rowtype;
  s public.services%rowtype;
BEGIN
  SELECT o.* INTO o
  FROM public.orders o
  JOIN public.services s ON s.id=o.service_id
  WHERE o.id=p_order_id AND o.user_id=auth.uid() AND o.deleted_at IS NULL
    AND s.refill AND o.status IN ('COMPLETED','PARTIAL')
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not eligible for refill'; END IF;
  IF o.refill_status='PENDING' THEN
    RETURN jsonb_build_object('success',true,'already_pending',true);
  END IF;
  UPDATE public.orders SET refill_status='PENDING',updated_at=now() WHERE id=p_order_id;
  RETURN jsonb_build_object('success',true);
END;
$$;

-- Do not expose trigger helper functions through the REST API.
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
