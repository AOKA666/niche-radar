-- Run in the Supabase SQL Editor. Hyphenated identifiers must be quoted.
create table if not exists public."niche-radar-backups" (
  "niche-radar-user-id" uuid primary key references auth.users(id) on delete cascade,
  "niche-radar-data" jsonb not null,
  "niche-radar-updated-at" timestamptz not null default now()
);
alter table public."niche-radar-backups" enable row level security;
revoke all on public."niche-radar-backups" from anon;
grant select, insert, update on public."niche-radar-backups" to authenticated;
-- Preserve any existing policy; create this policy only when absent.
do $migration$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'niche-radar-backups'
      and policyname = 'own backups'
  ) then
    create policy "own backups" on public."niche-radar-backups"
      for all to authenticated
      using ((select auth.uid()) = "niche-radar-user-id")
      with check ((select auth.uid()) = "niche-radar-user-id");
  end if;
end
$migration$;
