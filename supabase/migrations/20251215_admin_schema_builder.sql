-- Admin schema builder tables

create extension if not exists "pgcrypto";

create or replace function public.is_admin_user(uid uuid)
returns boolean
language sql
stable
as $$
  select coalesce((select is_admin from public.profiles where id = uid limit 1), false);
$$;

create table if not exists public.admin_table_configs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  source_table text not null default 'nfl_plays',
  columns text[] not null default '{}',
  available_filters jsonb not null default '{}'::jsonb,
  default_filters jsonb not null default '{}'::jsonb,
  formulas jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_saved_views (
  id uuid primary key default gen_random_uuid(),
  config_id uuid references public.admin_table_configs(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_admin_table_configs_updated_at') then
    create trigger set_admin_table_configs_updated_at
    before update on public.admin_table_configs
    for each row execute procedure public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_admin_saved_views_updated_at') then
    create trigger set_admin_saved_views_updated_at
    before update on public.admin_saved_views
    for each row execute procedure public.set_updated_at();
  end if;
end $$;

create index if not exists admin_table_configs_slug_idx on public.admin_table_configs(slug);
create index if not exists admin_saved_views_config_idx on public.admin_saved_views(config_id);

alter table public.admin_table_configs enable row level security;
alter table public.admin_saved_views enable row level security;

create policy if not exists admin_table_configs_admin_all
on public.admin_table_configs
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

create policy if not exists admin_saved_views_admin_all
on public.admin_saved_views
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));
