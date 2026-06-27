-- Homeside league schema — run ONCE in Supabase → SQL Editor.
-- Safe to re-run (idempotent). See docs/league-setup.md for the full walkthrough.

-- 1) Roster: who may appear on the leaderboard, plus a friendly display name.
create table if not exists public.members (
  email        text primary key,
  display_name text not null
);

-- 2) Each participant's stored picks — one row per signed-in user. Scores are
--    NOT stored: every client recomputes them from the public ESPN results, so
--    we only ever persist the raw picks (two JSON blobs).
create table if not exists public.picks (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  predictions jsonb not null default '{}'::jsonb,
  fantasy     jsonb not null default '{}'::jsonb,
  home_code   text,
  updated_at  timestamptz not null default now()
);

-- keep updated_at honest on every write
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists picks_touch on public.picks;
create trigger picks_touch before update on public.picks
  for each row execute function public.touch_updated_at();

-- 3) Row-level security — the whole security model lives here.
alter table public.members enable row level security;
alter table public.picks   enable row level security;

-- members: any signed-in user may read the roster; only YOU edit it (here in the
-- SQL editor, which bypasses RLS) — so there's no client write policy.
drop policy if exists "members readable" on public.members;
create policy "members readable" on public.members
  for select to authenticated using (true);

-- picks: any signed-in user may READ everyone's picks (that's the leaderboard)…
drop policy if exists "picks readable" on public.picks;
create policy "picks readable" on public.picks
  for select to authenticated using (true);

-- …but may only WRITE their own row, and only if their email is on the roster.
drop policy if exists "picks insert own" on public.picks;
create policy "picks insert own" on public.picks
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and lower(auth.email()) in (select lower(email) from public.members)
  );

drop policy if exists "picks update own" on public.picks;
create policy "picks update own" on public.picks
  for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and lower(auth.email()) in (select lower(email) from public.members)
  );

-- 4) Seed the roster with your ~10 friends. EDIT THESE — add one row per person
--    using the exact Google email they'll sign in with.
insert into public.members (email, display_name) values
  ('smilemike0906@gmail.com', 'Mike')
  -- , ('friend1@gmail.com', 'Friend One')
  -- , ('friend2@gmail.com', 'Friend Two')
on conflict (email) do update set display_name = excluded.display_name;
