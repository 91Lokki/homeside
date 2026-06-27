-- Homeside league schema — run ONCE in Supabase → SQL Editor.
-- Safe to re-run (idempotent). See docs/league-setup.md for the full walkthrough.
--
-- Model: AUTO-JOIN. Anyone who signs in with Google automatically gets a row and
-- appears on the leaderboard — no manual roster management. RLS still ensures each
-- person can only write THEIR OWN row. The `members` table is now OPTIONAL: it's
-- just a friendly-name override (e.g. to rename someone on the board).

-- 1) Optional display-name overrides (board defaults to each user's Google name).
create table if not exists public.members (
  email        text primary key,
  display_name text not null
);

-- 2) Each participant's stored picks — one row per signed-in user. Scores are
--    NOT stored: every client recomputes them from the public ESPN results, so
--    we only ever persist the raw picks (two JSON blobs) + who they are.
create table if not exists public.picks (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  display_name text,
  predictions  jsonb not null default '{}'::jsonb,
  fantasy      jsonb not null default '{}'::jsonb,
  home_code    text,
  updated_at   timestamptz not null default now()
);
-- If upgrading an existing project, add the column that may not exist yet:
alter table public.picks add column if not exists display_name text;

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

-- members: any signed-in user may read the name overrides; only YOU edit it (here
-- in the SQL editor, which bypasses RLS) — so there's no client write policy.
drop policy if exists "members readable" on public.members;
create policy "members readable" on public.members
  for select to authenticated using (true);

-- picks: any signed-in user may READ everyone's picks (that's the leaderboard)…
drop policy if exists "picks readable" on public.picks;
create policy "picks readable" on public.picks
  for select to authenticated using (true);

-- …and may WRITE their OWN row (auto-join — no allowlist). The auth.uid() check
-- is what stops anyone from writing as someone else.
drop policy if exists "picks insert own" on public.picks;
create policy "picks insert own" on public.picks
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "picks update own" on public.picks;
create policy "picks update own" on public.picks
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3b) Table-level grants. RLS decides WHICH ROWS the authenticated role sees, but
--     the role still needs base table access — without these, queries fail with
--     "permission denied for table picks" before RLS is ever evaluated. (Supabase
--     usually auto-grants these; we set them explicitly so this script is
--     self-sufficient on any project.)
grant usage on schema public to authenticated;
grant select, insert, update on public.picks to authenticated;
grant select on public.members to authenticated;

-- 4) (Optional) Rename anyone on the board. Not required — the leaderboard shows
--    each player's Google name by default. Use this only to override a name.
-- insert into public.members (email, display_name) values
--   ('friend@gmail.com', 'Nickname')
-- on conflict (email) do update set display_name = excluded.display_name;
