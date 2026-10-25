-- Peques: what each family saves.
--
-- Anonymous-first: Supabase gives every visitor a user id without a login, so
-- saving works on the first tap. Attaching an email later keeps the same id,
-- so nothing is lost and the data follows you to another device.
--
-- Run this in the Supabase SQL editor of the Peques project, then enable
-- Authentication → Providers → Anonymous sign-ins.

-- ---------------------------------------------------------------- favourites
create table if not exists public.favourites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  place_id    text not null,
  -- a snapshot, so a saved place survives the next OpenStreetMap import
  place       jsonb not null,
  created_at  timestamptz not null default now(),
  unique (user_id, place_id)
);

-- -------------------------------------------------------------------- visits
create table if not exists public.visits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  place_id    text not null,
  place       jsonb not null,
  went_on     date not null default current_date,
  rating      text not null check (rating in ('loved', 'ok', 'no')),
  tags        text[] not null default '{}',
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists favourites_user_idx on public.favourites (user_id, created_at desc);
create index if not exists visits_user_idx     on public.visits (user_id, went_on desc);

-- ------------------------------------------------------------------- privacy
-- Every row belongs to one account and is invisible to everyone else.
alter table public.favourites enable row level security;
alter table public.visits     enable row level security;

drop policy if exists "own favourites" on public.favourites;
create policy "own favourites" on public.favourites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own visits" on public.visits;
create policy "own visits" on public.visits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Deleting the account deletes everything with it (cascade above).
-- No child names, no photos, no location history are stored anywhere here.
