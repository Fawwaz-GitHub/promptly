-- Promptly initial schema. Run in Supabase SQL editor (or `supabase db push`).

-- One row per signed-in user. `plan` drives limits (see web/src/lib/plans.ts).
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz not null default now()
);

-- Lifetime counter for anonymous devices (5 free refinements).
create table if not exists public.anon_usage (
  device_id text primary key,
  count int not null default 0,
  ip text,
  updated_at timestamptz not null default now()
);

-- Every successful refinement (used for daily limits on paid plans + analytics).
create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  device_id text,
  chars_in int not null,
  model text,
  mode text,
  created_at timestamptz not null default now()
);
create index if not exists usage_events_user_day on public.usage_events (user_id, created_at);

-- RLS: users may read their own profile & events; all writes go through the server (service role).
alter table public.profiles enable row level security;
alter table public.anon_usage enable row level security;
alter table public.usage_events enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "read own events" on public.usage_events;
create policy "read own events" on public.usage_events for select using (auth.uid() = user_id);

-- Auto-create a profile on sign-up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atomically consume one anonymous refinement. Returns the new count, or -1 if the limit is reached.
create or replace function public.consume_anon(p_device text, p_ip text, p_limit int) returns int
language plpgsql security definer set search_path = public as $$
declare v int;
begin
  insert into anon_usage (device_id, count, ip) values (p_device, 0, p_ip) on conflict (device_id) do nothing;
  update anon_usage set count = count + 1, ip = p_ip, updated_at = now()
    where device_id = p_device and count < p_limit
    returning count into v;
  return coalesce(v, -1);
end $$;

create or replace function public.refund_anon(p_device text) returns void
language sql security definer set search_path = public as $$
  update anon_usage set count = greatest(count - 1, 0) where device_id = p_device;
$$;

revoke execute on function public.consume_anon(text, text, int) from public, anon, authenticated;
revoke execute on function public.refund_anon(text) from public, anon, authenticated;
