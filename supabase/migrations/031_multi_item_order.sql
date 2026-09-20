begin;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  game_id uuid not null references public.games(id),
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric not null check (unit_price >= 0),
  cost_price numeric not null default 0 check (cost_price >= 0),
  subtotal numeric not null check (subtotal >= 0),
  player_data jsonb not null default '{}'::jsonb,
  status text not null default 'PENDING' check (status in ('PENDING','PROCESSING','SUCCESS','FAILED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_items_product_id on public.order_items(product_id);
create index if not exists idx_order_items_game_id on public.order_items(game_id);
create index if not exists idx_order_items_status on public.order_items(status);

alter table public.order_items enable row level security;

create policy "Users read own order items"
on public.order_items for select
to authenticated
using (exists (
  select 1 from public.orders o
  where o.id = order_items.order_id
    and o.user_id = (select auth.uid())
));

create policy "Admins read all order items"
on public.order_items for select
to authenticated
using ((select public.is_admin()));

create policy "Admins manage order items"
on public.order_items for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

insert into public.order_items (
  order_id, product_id, game_id, quantity, unit_price, cost_price, subtotal, player_data, status, created_at, updated_at
)
select
  o.id,
  o.product_id,
  o.game_id,
  coalesce(nullif((o.player_data -> '_order_items' -> 0 ->> 'quantity'), '')::integer, 1),
  case
    when coalesce(nullif((o.player_data -> '_order_items' -> 0 ->> 'quantity'), '')::integer, 1) > 1
      then o.subtotal / coalesce(nullif((o.player_data -> '_order_items' -> 0 ->> 'quantity'), '')::numeric, 1)
    else o.subtotal
  end,
  coalesce(p.cost, 0),
  o.subtotal,
  (o.player_data - '_order_items' - '_total_packages_count'),
  case
    when o.status = 'SUCCESS' then 'SUCCESS'
    when o.status in ('PROCESSING','PAID') then 'PROCESSING'
    when o.status = 'FAILED' then 'FAILED'
    else 'PENDING'
  end,
  o.created_at,
  o.updated_at
from public.orders o
join public.products p on p.id = o.product_id and p.game_id = o.game_id
where o.product_id is not null
  and o.game_id is not null
  and not exists (select 1 from public.order_items oi where oi.order_id = o.id);

commit;
