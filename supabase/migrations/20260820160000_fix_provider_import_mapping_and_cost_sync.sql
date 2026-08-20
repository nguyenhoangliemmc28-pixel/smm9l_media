-- Provider sync hardening applied to production.
-- Import creates/updates the first-class provider_services mapping.
-- Price sync updates provider cost only; customer selling price is preserved.

create unique index if not exists services_provider_mapping_unique
  on public.services(provider_id, provider_service_id)
  where provider_id is not null and provider_service_id is not null;

create or replace function public.admin_import_provider_services(p_provider_id uuid, p_services jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_cat_id uuid; v_svc jsonb; v_service_id uuid; v_count integer:=0; v_updated integer:=0; v_provider_service_id text; v_provider_cost numeric;
begin
  if not public.is_admin() then raise exception 'Permission denied'; end if;
  if p_services is null or jsonb_typeof(p_services) <> 'array' then raise exception 'Invalid services payload'; end if;
  select id into v_cat_id from public.categories where slug='imported' and deleted_at is null limit 1;
  if v_cat_id is null then
    insert into public.categories(name,slug,sort_order,status,code_number,description,icon_glow_color)
    values('Imported','imported',999,true,'99','Dịch vụ được import từ provider','blue') returning id into v_cat_id;
  end if;
  for v_svc in select value from jsonb_array_elements(p_services)
  loop
    v_provider_service_id := nullif(trim(coalesce(v_svc->>'service',v_svc->>'id','')),'');
    if v_provider_service_id is null then continue; end if;
    v_provider_cost := greatest(0,coalesce(nullif(v_svc->>'rate','')::numeric,0));
    select id into v_service_id from public.services where provider_id=p_provider_id::text and provider_service_id=v_provider_service_id limit 1;
    if v_service_id is null then
      insert into public.services(category_id,provider_id,provider_service_id,name,description,type,price,cost,profit,minimum,maximum,refill,cancel,average_time,estimated_time,average_speed,featured,status,visibility,sort_order,api_type,tags,platform,sub_category_type,badges,is_available)
      values(v_cat_id,p_provider_id::text,v_provider_service_id,coalesce(nullif(v_svc->>'name',''),'Provider service '||v_provider_service_id),coalesce(v_svc->>'description',''),coalesce(v_svc->>'type','DEFAULT'),v_provider_cost,v_provider_cost,0,greatest(0,coalesce(nullif(v_svc->>'min','')::integer,1)),greatest(0,coalesce(nullif(v_svc->>'max','')::integer,10000)),coalesce((v_svc->>'refill')::boolean,false),coalesce((v_svc->>'cancel')::boolean,false),coalesce(v_svc->>'average_time',''),coalesce(v_svc->>'estimated_time',''),coalesce(v_svc->>'average_speed',''),false,true,true,0,coalesce(v_svc->>'api_type','standard'),array[]::text[],nullif(v_svc->>'platform',''),nullif(v_svc->>'category',''),array[]::text[],true)
      returning id into v_service_id;
      v_count:=v_count+1;
    else
      update public.services set name=coalesce(nullif(v_svc->>'name',''),name),description=coalesce(v_svc->>'description',description),cost=v_provider_cost,profit=price-v_provider_cost,minimum=greatest(0,coalesce(nullif(v_svc->>'min','')::integer,minimum)),maximum=greatest(0,coalesce(nullif(v_svc->>'max','')::integer,maximum)),refill=coalesce((v_svc->>'refill')::boolean,refill),cancel=coalesce((v_svc->>'cancel')::boolean,cancel),updated_at=now() where id=v_service_id;
      v_updated:=v_updated+1;
    end if;
    insert into public.provider_services(provider_id,service_id,provider_service_id,provider_name,provider_type,provider_cost,provider_minimum,provider_maximum,provider_refill,provider_cancel,provider_status,last_synced_at,updated_at)
    values(p_provider_id,v_service_id,v_provider_service_id,v_svc->>'name',v_svc->>'type',v_provider_cost,nullif(v_svc->>'min','')::integer,nullif(v_svc->>'max','')::integer,(v_svc->>'refill')::boolean,(v_svc->>'cancel')::boolean,'ACTIVE',now(),now())
    on conflict(provider_id,provider_service_id) do update set service_id=excluded.service_id,provider_name=excluded.provider_name,provider_type=excluded.provider_type,provider_cost=excluded.provider_cost,provider_minimum=excluded.provider_minimum,provider_maximum=excluded.provider_maximum,provider_refill=excluded.provider_refill,provider_cancel=excluded.provider_cancel,provider_status=excluded.provider_status,last_synced_at=now(),updated_at=now();
  end loop;
  insert into public.admin_logs(admin_id,action,entity,entity_id,details) values(auth.uid(),'IMPORT_SERVICES','provider',p_provider_id::text,jsonb_build_object('created',v_count,'updated',v_updated));
  return jsonb_build_object('success',true,'imported',v_count,'updated',v_updated,'total',v_count+v_updated);
end;
$$;
revoke all on function public.admin_import_provider_services(uuid,jsonb) from public,anon;
grant execute on function public.admin_import_provider_services(uuid,jsonb) to authenticated;

create or replace function public.admin_sync_provider_prices(p_provider_id uuid,p_prices jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_svc jsonb; v_count integer:=0; v_cost numeric; v_provider_service_id text;
begin
  if not public.is_admin() then raise exception 'Permission denied'; end if;
  if p_prices is null or jsonb_typeof(p_prices) <> 'array' then raise exception 'Invalid prices payload'; end if;
  for v_svc in select value from jsonb_array_elements(p_prices)
  loop
    v_provider_service_id := nullif(trim(coalesce(v_svc->>'service',v_svc->>'id','')),'');
    if v_provider_service_id is null then continue; end if;
    v_cost := greatest(0,coalesce(nullif(v_svc->>'rate','')::numeric,0));
    update public.services set cost=v_cost,profit=price-v_cost,minimum=greatest(0,coalesce(nullif(v_svc->>'min','')::integer,minimum)),maximum=greatest(0,coalesce(nullif(v_svc->>'max','')::integer,maximum)),refill=coalesce((v_svc->>'refill')::boolean,refill),cancel=coalesce((v_svc->>'cancel')::boolean,cancel),updated_at=now() where provider_id=p_provider_id::text and provider_service_id=v_provider_service_id;
    update public.provider_services set provider_cost=v_cost,provider_minimum=nullif(v_svc->>'min','')::integer,provider_maximum=nullif(v_svc->>'max','')::integer,provider_refill=(v_svc->>'refill')::boolean,provider_cancel=(v_svc->>'cancel')::boolean,provider_status='ACTIVE',last_synced_at=now(),updated_at=now() where provider_id=p_provider_id and provider_service_id=v_provider_service_id;
    if found then v_count:=v_count+1; end if;
  end loop;
  insert into public.admin_logs(admin_id,action,entity,entity_id,details) values(auth.uid(),'SYNC_PRICES','provider',p_provider_id::text,jsonb_build_object('count',v_count));
  return jsonb_build_object('success',true,'synced',v_count);
end;
$$;
revoke all on function public.admin_sync_provider_prices(uuid,jsonb) from public,anon;
grant execute on function public.admin_sync_provider_prices(uuid,jsonb) to authenticated;
