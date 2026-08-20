create or replace function public.admin_fetch_orders_all(p_limit integer default 100, p_offset integer default 0, p_status text default null)
returns table(id uuid, user_id uuid, service_id uuid, provider_order_id text, link text, quantity integer, start_count integer, current_count integer, remains integer, charge numeric, cost numeric, profit numeric, status text, refill_status text, cancel_status text, created_at timestamptz, updated_at timestamptz, completed_at timestamptz, username text, service_name text, category_name text)
language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then raise exception 'Unauthorized'; end if;
  return query
  select o.id,o.user_id,o.service_id,o.provider_order_id,o.link,o.quantity,o.start_count,o.current_count,o.remains,o.charge,o.cost,o.profit,o.status,o.refill_status,o.cancel_status,o.created_at,o.updated_at,o.completed_at,coalesce(p.username,'[PROVIDER IMPORT]'),s.name,c.name
  from orders o
  left join profiles p on p.id=o.user_id
  join services s on s.id=o.service_id
  join categories c on c.id=s.category_id
  where (p_status is null or o.status=p_status)
  order by o.created_at desc limit p_limit offset p_offset;
end; $$;
