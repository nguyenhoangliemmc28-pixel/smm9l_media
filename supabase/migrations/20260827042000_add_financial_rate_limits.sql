-- Server-side abuse protection for money/order/ticket creation.
CREATE OR REPLACE FUNCTION public.enforce_user_rate_limit(
  p_action text,
  p_window interval,
  p_limit integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u uuid := auth.uid();
  v_count integer;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_limit < 1 OR p_window <= interval '0 seconds' THEN RAISE EXCEPTION 'Invalid rate limit'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(u::text || ':' || p_action, 0));

  IF p_action='ORDER' THEN
    SELECT count(*) INTO v_count FROM public.orders WHERE user_id=u AND created_at >= now()-p_window;
  ELSIF p_action='DEPOSIT' THEN
    SELECT count(*) INTO v_count FROM public.deposits WHERE user_id=u AND created_at >= now()-p_window;
  ELSIF p_action='WITHDRAW' THEN
    SELECT count(*) INTO v_count FROM public.withdrawals WHERE user_id=u AND created_at >= now()-p_window;
  ELSIF p_action='TICKET' THEN
    SELECT count(*) INTO v_count FROM public.tickets WHERE user_id=u AND created_at >= now()-p_window;
  ELSE
    RAISE EXCEPTION 'Unknown rate limit action';
  END IF;

  IF v_count >= p_limit THEN RAISE EXCEPTION 'Too many requests'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_order(p_service_id uuid, p_link text, p_quantity integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  s public.services%rowtype;
  u uuid := auth.uid();
  b numeric;
  charge numeric;
  oid uuid;
BEGIN
  IF u IS NULL THEN RETURN jsonb_build_object('success',false,'message','Not authenticated'); END IF;
  IF p_link IS NULL OR p_link !~ '^https?://' THEN RETURN jsonb_build_object('success',false,'message','Link không hợp lệ'); END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RETURN jsonb_build_object('success',false,'message','Quantity out of range'); END IF;

  PERFORM public.enforce_user_rate_limit('ORDER', interval '1 minute', 30);

  SELECT * INTO s FROM public.services
  WHERE id=p_service_id AND status=true AND visibility=true
  FOR SHARE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'message','Service not available'); END IF;
  IF p_quantity < s.minimum OR p_quantity > s.maximum THEN RETURN jsonb_build_object('success',false,'message','Quantity out of range'); END IF;
  IF s.price < 0 THEN RETURN jsonb_build_object('success',false,'message','Invalid service price'); END IF;

  charge := round((s.price * p_quantity) / 1000, 2);
  SELECT balance INTO b FROM public.profiles WHERE id=u FOR UPDATE;
  IF b IS NULL THEN RETURN jsonb_build_object('success',false,'message','Profile not found'); END IF;
  IF b < charge THEN RETURN jsonb_build_object('success',false,'message','Insufficient balance'); END IF;

  UPDATE public.profiles SET balance=balance-charge,updated_at=now() WHERE id=u;
  INSERT INTO public.orders(user_id,service_id,provider_id,link,quantity,charge,cost,profit,status)
  VALUES(u,p_service_id,s.provider_id,p_link,p_quantity,charge,0,charge,'PENDING') RETURNING id INTO oid;
  INSERT INTO public.wallet_transactions(user_id,type,amount,balance_before,balance_after,description,reference_id)
  VALUES(u,'ORDER',-charge,b,b-charge,'Đơn hàng '||oid,oid::text);
  INSERT INTO public.notifications(user_id,title,content,type)
  VALUES(u,'Đơn hàng đã tạo','Đơn hàng '||oid||' đang chờ xử lý','ORDER');
  PERFORM public.enqueue_order(oid);
  RETURN jsonb_build_object('success',true,'order_id',oid,'charge',charge,'provider_id',s.provider_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_deposit_request(p_bank text,p_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); dep_id uuid; code text; min_amount numeric:=0; max_amount numeric:=999999999999;
BEGIN
  IF u IS NULL THEN RETURN jsonb_build_object('success',false,'message','Chưa đăng nhập'); END IF;
  PERFORM public.enforce_user_rate_limit('DEPOSIT', interval '1 hour', 10);
  SELECT coalesce(nullif(value,'')::numeric,0) INTO min_amount FROM public.settings WHERE key='deposit_min';
  SELECT coalesce(nullif(value,'')::numeric,999999999999) INTO max_amount FROM public.settings WHERE key='deposit_max';
  IF p_amount IS NULL OR p_amount < greatest(1,min_amount) OR p_amount > max_amount THEN RETURN jsonb_build_object('success',false,'message','Số tiền nạp không hợp lệ'); END IF;
  IF p_bank IS NULL OR length(trim(p_bank))=0 THEN RETURN jsonb_build_object('success',false,'message','Thiếu ngân hàng'); END IF;
  code := 'DEP' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  INSERT INTO public.deposits(user_id,txn_code,bank,amount,status) VALUES(u,code,left(trim(p_bank),100),round(p_amount,2),'PENDING') RETURNING id INTO dep_id;
  RETURN jsonb_build_object('success',true,'deposit_id',dep_id,'txn_code',code,'status','PENDING');
END $$;

CREATE OR REPLACE FUNCTION public.request_withdraw(p_amount numeric,p_bank text,p_account_number text,p_account_name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); b numeric; w uuid; v_amount numeric(18,2);
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  IF p_bank IS NULL OR length(trim(p_bank))=0 OR p_account_number IS NULL OR length(trim(p_account_number))=0 OR p_account_name IS NULL OR length(trim(p_account_name))=0 THEN RAISE EXCEPTION 'Missing withdrawal details'; END IF;
  v_amount:=round(p_amount,2);
  PERFORM public.enforce_user_rate_limit('WITHDRAW', interval '1 day', 5);
  SELECT balance INTO b FROM public.profiles WHERE id=u FOR UPDATE;
  IF b IS NULL OR b < v_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
  INSERT INTO public.withdrawals(user_id,amount,bank,account_number,account_name,status)
  VALUES(u,v_amount,left(trim(p_bank),100),left(trim(p_account_number),100),left(trim(p_account_name),200),'PENDING') RETURNING id INTO w;
  UPDATE public.profiles SET balance=balance-v_amount,updated_at=now() WHERE id=u;
  INSERT INTO public.wallet_transactions(user_id,type,amount,balance_before,balance_after,description,reference_id)
  VALUES(u,'WITHDRAW',-v_amount,b,b-v_amount,'Yêu cầu rút tiền',w::text);
  RETURN jsonb_build_object('success',true,'id',w,'amount',v_amount);
END $$;

CREATE OR REPLACE FUNCTION public.enforce_ticket_rate_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.enforce_user_rate_limit('TICKET', interval '1 hour', 10);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tickets_rate_limit ON public.tickets;
CREATE TRIGGER tickets_rate_limit
BEFORE INSERT ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.enforce_ticket_rate_limit();

REVOKE EXECUTE ON FUNCTION public.enforce_user_rate_limit(text,interval,integer) FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_ticket_rate_limit() FROM PUBLIC,anon,authenticated;
