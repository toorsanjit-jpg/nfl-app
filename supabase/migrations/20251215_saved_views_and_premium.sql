-- Saved views storage and premium flag support.

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (
    select 1 from pg_tables where schemaname = 'public' and tablename = 'saved_views'
  ) then
    create table public.saved_views (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      scope text not null check (scope in ('league', 'team')),
      team_id text null,
      category text not null check (category in ('offense', 'defense', 'special')),
      name text not null,
      filters jsonb not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint team_scope_requires_id check (
        (scope = 'team' and team_id is not null) or scope = 'league'
      )
    );
  end if;
end $$;

create or replace function public.saved_views_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_saved_views_updated_at'
  ) then
    create trigger set_saved_views_updated_at
    before update on public.saved_views
    for each row execute procedure public.saved_views_set_updated_at();
  end if;
end $$;

create index if not exists saved_views_user_idx on public.saved_views(user_id);
create index if not exists saved_views_scope_team_idx on public.saved_views(scope, team_id);

alter table public.saved_views enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'saved_views' and polname = 'saved_views_select_own'
  ) then
    create policy saved_views_select_own
      on public.saved_views
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'saved_views' and polname = 'saved_views_insert_own'
  ) then
    create policy saved_views_insert_own
      on public.saved_views
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'saved_views' and polname = 'saved_views_update_own'
  ) then
    create policy saved_views_update_own
      on public.saved_views
      for update
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'saved_views' and polname = 'saved_views_delete_own'
  ) then
    create policy saved_views_delete_own
      on public.saved_views
      for delete
      using (auth.uid() = user_id);
  end if;
end $$;

-- Add premium flag to profiles when present.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles'
  ) then
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name = 'is_premium'
    ) then
      alter table public.profiles
        add column is_premium boolean default false;
    end if;
  end if;
end $$;
