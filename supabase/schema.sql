-- Pinote: friends / group-map sharing schema + Row Level Security.
-- Run this in the Supabase SQL editor (once) after creating your project.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_url   text,
  created_at   timestamptz not null default now()
);

create table if not exists public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  icon       text not null default '📍',
  color      text not null default '#FF5B4A',
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id  uuid not null references public.groups (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.group_invites (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  code       text not null unique,
  invited_by uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.shared_memos (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  title      text not null,
  body       text not null default '',
  category   text not null default 'other',
  lat        double precision not null,
  lng        double precision not null,
  rating     int not null default 0,
  want_to_go boolean not null default false,
  tags       jsonb not null default '[]'::jsonb,
  photo_url  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shared_memos_group on public.shared_memos (group_id, updated_at desc);
create index if not exists idx_group_members_user on public.group_members (user_id);

-- Moderation (App Store UGC requirement): report content, block users.
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  memo_id     uuid references public.shared_memos (id) on delete cascade,
  reason      text,
  created_at  timestamptz not null default now()
);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

-- ---------------------------------------------------------------------------
-- Helper (SECURITY DEFINER avoids RLS recursion on group_members)
-- ---------------------------------------------------------------------------

create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles       enable row level security;
alter table public.groups         enable row level security;
alter table public.group_members  enable row level security;
alter table public.group_invites  enable row level security;
alter table public.shared_memos   enable row level security;
alter table public.reports        enable row level security;
alter table public.blocks         enable row level security;

-- profiles: anyone signed in can read (to show member names); you edit only your own.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);
drop policy if exists profiles_upsert on public.profiles;
create policy profiles_upsert on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid());

-- groups: members can read; anyone can create (as owner); owner can edit/delete.
drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups for select to authenticated using (public.is_group_member(id));
drop policy if exists groups_insert on public.groups;
create policy groups_insert on public.groups for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists groups_update on public.groups;
create policy groups_update on public.groups for update to authenticated using (owner_id = auth.uid());
drop policy if exists groups_delete on public.groups;
create policy groups_delete on public.groups for delete to authenticated using (owner_id = auth.uid());

-- group_members: members can see the roster; you can remove yourself (leave).
-- Joining is done via the join_group_by_code RPC (SECURITY DEFINER), not direct insert.
drop policy if exists members_select on public.group_members;
create policy members_select on public.group_members for select to authenticated using (public.is_group_member(group_id));
drop policy if exists members_leave on public.group_members;
create policy members_leave on public.group_members for delete to authenticated using (user_id = auth.uid());

-- group_invites: members can read/create codes for their groups.
drop policy if exists invites_select on public.group_invites;
create policy invites_select on public.group_invites for select to authenticated using (public.is_group_member(group_id));
drop policy if exists invites_insert on public.group_invites;
create policy invites_insert on public.group_invites for insert to authenticated with check (public.is_group_member(group_id) and invited_by = auth.uid());

-- shared_memos: members read; members add (as author); author or group owner edits/deletes.
drop policy if exists memos_select on public.shared_memos;
create policy memos_select on public.shared_memos for select to authenticated using (public.is_group_member(group_id));
drop policy if exists memos_insert on public.shared_memos;
create policy memos_insert on public.shared_memos for insert to authenticated
  with check (public.is_group_member(group_id) and author_id = auth.uid());
drop policy if exists memos_update on public.shared_memos;
create policy memos_update on public.shared_memos for update to authenticated
  using (author_id = auth.uid() or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()));
drop policy if exists memos_delete on public.shared_memos;
create policy memos_delete on public.shared_memos for delete to authenticated
  using (author_id = auth.uid() or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()));

-- reports / blocks: you manage your own rows.
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated with check (reporter_id = auth.uid());
drop policy if exists blocks_all on public.blocks;
create policy blocks_all on public.blocks for all to authenticated using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Create a group and add the creator as its owner-member, atomically.
create or replace function public.create_group(p_name text, p_icon text, p_color text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare gid uuid;
begin
  insert into public.groups (name, icon, color, owner_id)
  values (p_name, coalesce(p_icon, '📍'), coalesce(p_color, '#FF5B4A'), auth.uid())
  returning id into gid;
  insert into public.group_members (group_id, user_id, role) values (gid, auth.uid(), 'owner');
  return gid;
end;
$$;

-- Join a group from an invite code (bypasses members insert RLS safely).
create or replace function public.join_group_by_code(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare gid uuid;
begin
  select group_id into gid from public.group_invites
  where code = invite_code and (expires_at is null or expires_at > now());
  if gid is null then
    raise exception 'invalid or expired invite code';
  end if;
  insert into public.group_members (group_id, user_id, role)
  values (gid, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;
  return gid;
end;
$$;

-- App Store account deletion: wipe the caller's data and auth user.
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.shared_memos where author_id = auth.uid();
  delete from public.groups where owner_id = auth.uid();       -- cascades members/invites/memos
  delete from public.group_members where user_id = auth.uid();
  delete from public.profiles where id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------------
-- Realtime: stream shared_memos changes to group members.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.shared_memos;
