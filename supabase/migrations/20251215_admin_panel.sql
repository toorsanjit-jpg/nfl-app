-- Admin panel schema and gating (Batch #8)

create extension if not exists "pgcrypto";

-- Add admin flag to profiles
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles'
  ) then
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_admin'
    ) then
      alter table public.profiles add column is_admin boolean default false;
    end if;
  end if;
end $$;

-- Helper predicate for admin checks
create or replace function public.is_admin_user(uid uuid)
returns boolean
language sql
stable
as $$
  select coalesce(
    (select is_admin from public.profiles where id = uid limit 1),
    false
  );
$$;

-- 1) admin_fields
create table if not exists public.admin_fields (
  field_name text primary key,
  label text not null,
  category text not null check (category in ('offense','defense','special','meta')),
  is_public boolean default false,
  is_logged_in boolean default false,
  is_premium boolean default false,
  is_filterable boolean default false,
  data_type text not null check (data_type in ('number','text','boolean')),
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) admin_tables
create table if not exists public.admin_tables (
  table_key text primary key,
  title text not null,
  description text,
  is_enabled boolean default true,
  default_sort_field text,
  default_sort_dir text check (default_sort_dir in ('asc','desc')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) admin_table_fields
create table if not exists public.admin_table_fields (
  table_key text not null references public.admin_tables(table_key) on delete cascade,
  field_name text not null references public.admin_fields(field_name) on delete cascade,
  order_index int not null default 0,
  is_visible boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (table_key, field_name)
);

-- 4) admin_formulas
create table if not exists public.admin_formulas (
  formula_key text primary key,
  label text not null,
  description text,
  sql_expression text not null,
  applies_to text not null check (applies_to in ('offense','defense','special')),
  is_premium boolean default true,
  is_enabled boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5) admin_filters
create table if not exists public.admin_filters (
  filter_key text primary key,
  field_name text not null,
  operator text not null check (operator in ('=','!=','<','>','<=','>=','between','in')),
  is_public boolean default false,
  is_premium boolean default false,
  ui_type text not null check (ui_type in ('toggle','dropdown','multiselect')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Updated-at triggers
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_admin_fields_updated_at') then
    create trigger set_admin_fields_updated_at before update on public.admin_fields
    for each row execute procedure public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_admin_tables_updated_at') then
    create trigger set_admin_tables_updated_at before update on public.admin_tables
    for each row execute procedure public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_admin_table_fields_updated_at') then
    create trigger set_admin_table_fields_updated_at before update on public.admin_table_fields
    for each row execute procedure public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_admin_formulas_updated_at') then
    create trigger set_admin_formulas_updated_at before update on public.admin_formulas
    for each row execute procedure public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_admin_filters_updated_at') then
    create trigger set_admin_filters_updated_at before update on public.admin_filters
    for each row execute procedure public.set_updated_at();
  end if;
end $$;

-- Indexes
create index if not exists admin_fields_category_idx on public.admin_fields(category, order_index);
create index if not exists admin_tables_enabled_idx on public.admin_tables(is_enabled);
create index if not exists admin_table_fields_table_idx on public.admin_table_fields(table_key, order_index);
create index if not exists admin_formulas_enabled_idx on public.admin_formulas(is_enabled, applies_to);
create index if not exists admin_filters_visibility_idx on public.admin_filters(is_public, is_premium);

-- RLS
alter table public.admin_fields enable row level security;
alter table public.admin_tables enable row level security;
alter table public.admin_table_fields enable row level security;
alter table public.admin_formulas enable row level security;
alter table public.admin_filters enable row level security;

-- Policies: admin-only full access
create policy if not exists admin_fields_admin_all
on public.admin_fields
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

create policy if not exists admin_tables_admin_all
on public.admin_tables
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

create policy if not exists admin_table_fields_admin_all
on public.admin_table_fields
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

create policy if not exists admin_formulas_admin_all
on public.admin_formulas
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

create policy if not exists admin_filters_admin_all
on public.admin_filters
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));
