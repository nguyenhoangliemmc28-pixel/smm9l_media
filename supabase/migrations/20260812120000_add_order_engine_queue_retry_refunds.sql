-- 9L Media Order Engine
-- Queue -> dispatch -> provider id -> retry -> status sync -> refund

CREATE TABLE IF NOT EXISTS public.order_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','PROCESSING','SUCCEEDED','FAILED','DEAD')),
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  last_error text,
  provider_order_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_queue_ready ON public.order_queue(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_order_queue_order ON public.order_queue(order_id);

ALTER TABLE public.order_queue ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS order_queue_updated_at ON public.order_queue;
CREATE TRIGGER order_queue_updated_at BEFORE UPDATE ON public.order_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- One refund record per order makes refunds idempotent even if a cron runs twice.
CREATE TABLE IF NOT EXISTS public.order_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(18,2) NOT NULL CHECK (amount >= 0),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_refunds_user ON public.order_refunds(user_id, created_at);
ALTER TABLE public.order_refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_refunds_select_own" ON public.order_refunds;
CREATE POLICY "order_refunds_select_own" ON public.order_refunds
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Enqueue an order exactly once. Safe to call from create-order or a recovery job.
CREATE OR REPLACE FUNCTION public.enqueue_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_status text;
BEGIN
  SELECT status INTO v_status FROM orders WHERE id = p_order_id FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;

  INSERT INTO order_queue(order_id)
  VALUES (p_order_id)
  ON CONFLICT (order_id) DO UPDATE
    SET status = CASE WHEN order_queue.status = 'DEAD' THEN 'QUEUED' ELSE order_queue.status END,
        next_attempt_at = CASE WHEN order_queue.status = 'DEAD' THEN now() ELSE order_queue.next_attempt_at END,
        updated_at = now();

  UPDATE orders SET status = CASE WHEN status = 'PENDING' THEN 'PENDING' ELSE status END WHERE id = p_order_id;
  RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
END;
$$;

-- Atomically claim ready queue rows so two workers cannot dispatch the same order.
CREATE OR REPLACE FUNCTION public.claim_order_queue(p_limit integer DEFAULT 20)
RETURNS TABLE(queue_id uuid, order_id uuid, attempts integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT q.id
    FROM order_queue q
    WHERE q.status IN ('QUEUED','FAILED')
      AND q.next_attempt_at <= now()
      AND q.attempts < q.max_attempts
      AND q.locked_at IS NULL
    ORDER BY q.next_attempt_at, q.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(1, LEAST(p_limit, 100))
  ), claimed AS (
    UPDATE order_queue q
    SET status = 'PROCESSING',
        attempts = q.attempts + 1,
        locked_at = now(),
        updated_at = now()
    FROM picked p
    WHERE q.id = p.id
    RETURNING q.id, q.order_id, q.attempts
  )
  SELECT * FROM claimed;
END;
$$;

-- Provider dispatch result. The worker supplies provider_order_id only after the provider accepted it.
CREATE OR REPLACE FUNCTION public.complete_order_dispatch(
  p_queue_id uuid,
  p_provider_order_id text,
  p_provider_cost numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_order_id uuid;
BEGIN
  SELECT order_id INTO v_order_id FROM order_queue WHERE id = p_queue_id FOR UPDATE;
  IF v_order_id IS NULL THEN RAISE EXCEPTION 'Queue item not found'; END IF;

  UPDATE order_queue SET status='SUCCEEDED', locked_at=NULL, provider_order_id=p_provider_order_id,
    last_error=NULL, updated_at=now() WHERE id=p_queue_id;

  UPDATE orders SET provider_order_id=p_provider_order_id,
    cost=COALESCE(p_provider_cost,0), profit=charge-COALESCE(p_provider_cost,0),
    status='PROCESSING', updated_at=now() WHERE id=v_order_id;

  RETURN jsonb_build_object('success',true,'order_id',v_order_id,'provider_order_id',p_provider_order_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_order_dispatch(
  p_queue_id uuid,
  p_error text,
  p_retry_delay_seconds integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE q order_queue%ROWTYPE;
BEGIN
  SELECT * INTO q FROM order_queue WHERE id=p_queue_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Queue item not found'; END IF;

  IF q.attempts >= q.max_attempts THEN
    UPDATE order_queue SET status='DEAD', locked_at=NULL, last_error=left(p_error,1000), updated_at=now() WHERE id=p_queue_id;
    UPDATE orders SET status='FAILED', updated_at=now() WHERE id=q.order_id AND status NOT IN ('COMPLETED','PARTIAL','CANCELED','REFUNDED');
  ELSE
    UPDATE order_queue SET status='FAILED', locked_at=NULL, last_error=left(p_error,1000),
      next_attempt_at=now()+make_interval(secs=>GREATEST(5,p_retry_delay_seconds)), updated_at=now() WHERE id=p_queue_id;
  END IF;

  RETURN jsonb_build_object('success',true,'dead',q.attempts >= q.max_attempts,'attempts',q.attempts);
END;
$$;

-- Apply a provider status and refund exactly once when the final delivered amount is below the paid amount.
CREATE OR REPLACE FUNCTION public.apply_provider_status(
  p_order_id uuid,
  p_status text,
  p_start_count integer DEFAULT NULL,
  p_current_count integer DEFAULT NULL,
  p_remains integer DEFAULT NULL,
  p_provider_order_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  o orders%ROWTYPE;
  v_remains integer;
  v_refund numeric(18,2) := 0;
  v_before numeric(18,2);
  v_after numeric(18,2);
  v_final text := upper(p_status);
BEGIN
  SELECT * INTO o FROM orders WHERE id=p_order_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  v_remains := GREATEST(0, COALESCE(p_remains, o.remains, 0));

  IF v_final IN ('CANCELED','CANCELLED','FAILED') THEN
    v_refund := o.charge;
    v_final := 'CANCELED';
  ELSIF v_final='PARTIAL' THEN
    IF o.quantity > 0 THEN v_refund := round(o.charge * v_remains / o.quantity, 2); END IF;
  ELSIF v_final='COMPLETED' THEN
    v_refund := 0;
  END IF;

  UPDATE orders SET status=v_final,
    start_count=COALESCE(p_start_count,start_count),
    current_count=COALESCE(p_current_count,current_count),
    remains=COALESCE(p_remains,remains),
    provider_order_id=COALESCE(p_provider_order_id,provider_order_id),
    completed_at=CASE WHEN v_final IN ('COMPLETED','PARTIAL','CANCELED') THEN COALESCE(completed_at,now()) ELSE completed_at END,
    updated_at=now()
  WHERE id=p_order_id;

  IF v_refund > 0 THEN
    INSERT INTO order_refunds(order_id,user_id,amount,reason)
    VALUES(o.id,o.user_id,v_refund,CASE WHEN v_final='PARTIAL' THEN 'Hoàn phần chưa thực hiện' ELSE 'Hoàn tiền đơn không thể thực hiện' END)
    ON CONFLICT(order_id) DO NOTHING;

    IF FOUND THEN
      SELECT balance INTO v_before FROM profiles WHERE id=o.user_id FOR UPDATE;
      v_after := v_before + v_refund;
      UPDATE profiles SET balance=v_after WHERE id=o.user_id;
      INSERT INTO wallet_transactions(user_id,type,amount,balance_before,balance_after,description,reference_id)
      VALUES(o.user_id,'REFUND',v_refund,v_before,v_after,'Hoàn tiền đơn '||o.id,o.id::text);
      INSERT INTO notifications(user_id,title,content,type)
      VALUES(o.user_id,'Đơn hàng được hoàn tiền','Đơn '||o.id||' được hoàn '||v_refund::text,'PAYMENT');
    END IF;
  END IF;

  RETURN jsonb_build_object('success',true,'status',v_final,'refund',v_refund);
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_order FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_order TO authenticated;
REVOKE ALL ON FUNCTION public.claim_order_queue FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_order_dispatch FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_order_dispatch FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_provider_status FROM PUBLIC, anon, authenticated;

-- Service-role/Edge Functions only for worker operations.
