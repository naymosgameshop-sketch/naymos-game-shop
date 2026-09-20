begin;

create or replace function public.create_multi_item_order(
  p_items jsonb,
  p_coupon_code text default null,
  p_points_to_use integer default 0
)
returns public.orders
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_order public.orders;
  v_item jsonb;
  v_product public.products;
  v_game public.games;
  v_field record;
  v_player_data jsonb;
  v_quantity integer;
  v_unit_price numeric;
  v_item_subtotal numeric;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_total numeric;
  v_seen jsonb := '{}'::jsonb;
  v_key text;
  v_has_field boolean;
  v_value text;
begin
  if v_user_id is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'CART_EMPTY'; end if;
  if coalesce(p_points_to_use, 0) < 0 then raise exception 'INVALID_POINTS'; end if;

  select role into v_role from public.profiles where id = v_user_id;
  if v_role is null then raise exception 'PROFILE_NOT_FOUND'; end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity is null or v_quantity <= 0 then raise exception 'INVALID_QUANTITY'; end if;
    select * into v_product from public.products where id = (v_item->>'productId')::uuid;
    if not found or not v_product.is_active then raise exception 'INVALID_PRODUCT'; end if;
    if (v_item->>'gameId')::uuid <> v_product.game_id then raise exception 'PRODUCT_GAME_MISMATCH'; end if;
    v_player_data := coalesce(v_item->'playerData', '{}'::jsonb);
    if jsonb_typeof(v_player_data) <> 'object' then raise exception 'INVALID_PLAYER_DATA'; end if;
    for v_field in select name, required from public.game_fields where game_id = v_product.game_id loop
      v_value := nullif(btrim(v_player_data->>v_field.name), '');
      if v_field.required and v_value is null then raise exception 'MISSING_REQUIRED_FIELD:%', v_field.name; end if;
    end loop;
    for v_key in select key from jsonb_object_keys(v_player_data) key loop
      select exists(select 1 from public.game_fields where game_id = v_product.game_id and name = v_key) into v_has_field;
      if not v_has_field then raise exception 'UNKNOWN_PLAYER_FIELD:%', v_key; end if;
    end loop;
    v_key := (v_item->>'productId') || ':' || v_player_data::text;
    if v_seen ? v_key then raise exception 'DUPLICATE_CART_ITEM'; end if;
    v_seen := v_seen || jsonb_build_object(v_key, true);
    if v_role in ('reseller','admin','super_admin') and v_product.reseller_price is not null then v_unit_price := v_product.reseller_price; else v_unit_price := v_product.price; end if;
    v_item_subtotal := v_unit_price * v_quantity;
    v_subtotal := v_subtotal + v_item_subtotal;
  end loop;

  v_total := v_subtotal - v_discount;
  insert into public.orders (user_id, game_id, product_id, player_data, subtotal, discount, fee, total, status)
  values (v_user_id, (p_items->0->>'gameId')::uuid, (p_items->0->>'productId')::uuid, coalesce(p_items->0->'playerData','{}'::jsonb), v_subtotal, v_discount, 0, v_total, 'PENDING_PAYMENT')
  returning * into v_order;

  for v_item in select value from jsonb_array_elements(p_items) loop
    select * into v_product from public.products where id = (v_item->>'productId')::uuid;
    if v_role in ('reseller','admin','super_admin') and v_product.reseller_price is not null then v_unit_price := v_product.reseller_price; else v_unit_price := v_product.price; end if;
    insert into public.order_items (order_id, product_id, game_id, quantity, unit_price, cost_price, subtotal, player_data, status)
    values (v_order.id, v_product.id, v_product.game_id, (v_item->>'quantity')::integer, v_unit_price, v_product.cost, v_unit_price * (v_item->>'quantity')::integer, coalesce(v_item->'playerData','{}'::jsonb), 'PENDING');
  end loop;
  return v_order;
end;
$$;

revoke all on function public.create_multi_item_order(jsonb,text,integer) from public, anon;
grant execute on function public.create_multi_item_order(jsonb,text,integer) to authenticated;

commit;
