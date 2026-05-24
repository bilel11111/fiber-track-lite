
-- Materials catalog
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null check (category in ('cable','connector','splice','enclosure','tool','other')),
  unit text not null default 'pcs',
  stock_qty numeric not null default 0,
  min_stock numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Usage log
create table public.material_usages (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete cascade,
  user_id uuid not null,
  quantity numeric not null check (quantity > 0),
  bpi_id text,
  note text,
  scanned_at timestamptz not null default now()
);

alter table public.materials enable row level security;
alter table public.material_usages enable row level security;

-- Any authenticated user can read materials and manage them (MVP)
create policy "auth read materials" on public.materials for select to authenticated using (true);
create policy "auth insert materials" on public.materials for insert to authenticated with check (true);
create policy "auth update materials" on public.materials for update to authenticated using (true);

-- Usages: read all, insert as self, no update/delete
create policy "auth read usages" on public.material_usages for select to authenticated using (true);
create policy "auth insert own usages" on public.material_usages for insert to authenticated with check (auth.uid() = user_id);

-- Trigger: decrement stock on usage insert
create or replace function public.decrement_stock_on_usage()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.materials
    set stock_qty = stock_qty - new.quantity,
        updated_at = now()
    where id = new.material_id;
  return new;
end;
$$;

create trigger trg_decrement_stock
after insert on public.material_usages
for each row execute function public.decrement_stock_on_usage();

-- updated_at trigger for materials
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger trg_touch_materials before update on public.materials
for each row execute function public.touch_updated_at();
