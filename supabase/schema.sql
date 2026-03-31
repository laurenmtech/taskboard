-- Enable crypto functions for UUID generation
create extension if not exists pgcrypto;

-- Each auth user gets a profile with a user type.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  user_type text not null default 'individual' check (user_type in ('individual', 'team_member', 'team_admin')),
  created_at timestamptz not null default now()
);

-- A workspace can be personal (single user) or group (team board).
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  board_type text not null default 'personal' check (board_type in ('personal', 'group')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Membership links users to group workspaces with roles.
create table if not exists public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invitee_email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (workspace_id, invitee_email)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0),
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'in_review', 'done')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  due_date date,
  user_id uuid not null,
  created_at timestamptz not null default now()
);

alter table public.tasks
  add column if not exists workspace_id uuid,
  add column if not exists assignee_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tasks_workspace_id_fkey'
  ) then
    alter table public.tasks
      add constraint tasks_workspace_id_fkey
      foreign key (workspace_id)
      references public.workspaces(id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'tasks_user_id_fkey'
  ) then
    alter table public.tasks
      add constraint tasks_user_id_fkey
      foreign key (user_id)
      references auth.users(id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'tasks_assignee_id_fkey'
  ) then
    alter table public.tasks
      add constraint tasks_assignee_id_fkey
      foreign key (assignee_id)
      references auth.users(id)
      on delete set null;
  end if;
end
$$;

create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_user_status_idx on public.tasks (user_id, status);
create index if not exists tasks_user_due_date_idx on public.tasks (user_id, due_date);
create index if not exists tasks_workspace_id_idx on public.tasks (workspace_id);
create index if not exists workspace_memberships_workspace_user_idx on public.workspace_memberships (workspace_id, user_id);
create index if not exists workspace_memberships_user_idx on public.workspace_memberships (user_id);
create index if not exists workspace_invites_workspace_idx on public.workspace_invites (workspace_id);
create index if not exists workspace_invites_email_idx on public.workspace_invites (invitee_email);

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.tasks enable row level security;

-- Helper to check if current user has one of the allowed roles in a workspace.
-- SECURITY DEFINER avoids recursive RLS evaluation when used inside membership policies.
create or replace function public.has_workspace_role(target_workspace_id uuid, allowed_roles text[])
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_memberships wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
      and wm.role = any(allowed_roles)
  );
$$;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can read accessible workspaces" on public.workspaces;
create policy "Users can read accessible workspaces"
on public.workspaces
for select
using (
  created_by = auth.uid()
  or exists (
    select 1
    from public.workspace_memberships wm
    where wm.workspace_id = workspaces.id
      and wm.user_id = auth.uid()
  )
);

drop policy if exists "Users can create own workspaces" on public.workspaces;
create policy "Users can create own workspaces"
on public.workspaces
for insert
with check (created_by = auth.uid());

drop policy if exists "Owners and admins can update workspaces" on public.workspaces;
create policy "Owners and admins can update workspaces"
on public.workspaces
for update
using (
  created_by = auth.uid()
  or exists (
    select 1
    from public.workspace_memberships wm
    where wm.workspace_id = workspaces.id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  )
)
with check (
  created_by = auth.uid()
  or exists (
    select 1
    from public.workspace_memberships wm
    where wm.workspace_id = workspaces.id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  )
);

drop policy if exists "Owners and admins can delete workspaces" on public.workspaces;
create policy "Owners and admins can delete workspaces"
on public.workspaces
for delete
using (
  created_by = auth.uid()
  or exists (
    select 1
    from public.workspace_memberships wm
    where wm.workspace_id = workspaces.id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  )
);

drop policy if exists "Users can read memberships in their workspaces" on public.workspace_memberships;
create policy "Users can read memberships in their workspaces"
on public.workspace_memberships
for select
using (
  user_id = auth.uid()
  or public.has_workspace_role(workspace_memberships.workspace_id, array['owner', 'admin'])
);

drop policy if exists "Owners and admins can manage memberships" on public.workspace_memberships;
create policy "Owners and admins can manage memberships"
on public.workspace_memberships
for all
using (
  public.has_workspace_role(workspace_memberships.workspace_id, array['owner', 'admin'])
)
with check (
  public.has_workspace_role(workspace_memberships.workspace_id, array['owner', 'admin'])
);

drop policy if exists "Workspace creators can insert initial owner membership" on public.workspace_memberships;
create policy "Workspace creators can insert initial owner membership"
on public.workspace_memberships
for insert
with check (
  user_id = auth.uid()
  and role = 'owner'
  and exists (
    select 1
    from public.workspaces w
    where w.id = workspace_memberships.workspace_id
      and w.created_by = auth.uid()
  )
);

drop policy if exists "Invited users can join workspaces" on public.workspace_memberships;
create policy "Invited users can join workspaces"
on public.workspace_memberships
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.workspace_invites wi
    where wi.workspace_id = workspace_memberships.workspace_id
      and wi.status = 'pending'
      and lower(wi.invitee_email) = lower(coalesce(auth.jwt()->>'email', ''))
      and wi.role = workspace_memberships.role
  )
);

drop policy if exists "Owners and admins can read workspace invites" on public.workspace_invites;
create policy "Owners and admins can read workspace invites"
on public.workspace_invites
for select
using (
  exists (
    select 1
    from public.workspace_memberships wm
    where wm.workspace_id = workspace_invites.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  )
  or lower(workspace_invites.invitee_email) = lower(coalesce(auth.jwt()->>'email', ''))
);

drop policy if exists "Owners and admins can create workspace invites" on public.workspace_invites;
create policy "Owners and admins can create workspace invites"
on public.workspace_invites
for insert
with check (
  invited_by = auth.uid()
  and exists (
    select 1
    from public.workspace_memberships wm
    where wm.workspace_id = workspace_invites.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  )
);

drop policy if exists "Owners admins and invitees can update workspace invites" on public.workspace_invites;
create policy "Owners admins and invitees can update workspace invites"
on public.workspace_invites
for update
using (
  exists (
    select 1
    from public.workspace_memberships wm
    where wm.workspace_id = workspace_invites.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  )
  or lower(workspace_invites.invitee_email) = lower(coalesce(auth.jwt()->>'email', ''))
)
with check (
  exists (
    select 1
    from public.workspace_memberships wm
    where wm.workspace_id = workspace_invites.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  )
  or (
    lower(workspace_invites.invitee_email) = lower(coalesce(auth.jwt()->>'email', ''))
    and workspace_invites.status in ('pending', 'accepted')
  )
);

drop policy if exists "Users can read accessible tasks" on public.tasks;
create policy "Users can read accessible tasks"
on public.tasks
for select
using (
  user_id = auth.uid()
  or (
    workspace_id is not null
    and (
      exists (
        select 1
        from public.workspace_memberships wm
        where wm.workspace_id = tasks.workspace_id
          and wm.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.workspaces w
        where w.id = tasks.workspace_id
          and w.created_by = auth.uid()
      )
    )
  )
);

drop policy if exists "Users can insert own tasks" on public.tasks;
create policy "Users can insert own tasks"
on public.tasks
for insert
with check (
  user_id = auth.uid()
  and (
    workspace_id is null
    or (
      exists (
        select 1
        from public.workspace_memberships wm
        where wm.workspace_id = tasks.workspace_id
          and wm.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.workspaces w
        where w.id = tasks.workspace_id
          and w.created_by = auth.uid()
      )
    )
  )
);

drop policy if exists "Users can update accessible tasks" on public.tasks;
create policy "Users can update accessible tasks"
on public.tasks
for update
using (
  user_id = auth.uid()
  or (
    workspace_id is not null
    and (
      exists (
        select 1
        from public.workspace_memberships wm
        where wm.workspace_id = tasks.workspace_id
          and wm.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.workspaces w
        where w.id = tasks.workspace_id
          and w.created_by = auth.uid()
      )
    )
  )
)
with check (
  user_id = auth.uid()
  and (
    workspace_id is null
    or (
      exists (
        select 1
        from public.workspace_memberships wm
        where wm.workspace_id = tasks.workspace_id
          and wm.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.workspaces w
        where w.id = tasks.workspace_id
          and w.created_by = auth.uid()
      )
    )
  )
);

drop policy if exists "Users can delete accessible tasks" on public.tasks;
create policy "Users can delete accessible tasks"
on public.tasks
for delete
using (
  user_id = auth.uid()
  or (
    workspace_id is not null
    and (
      exists (
        select 1
        from public.workspace_memberships wm
        where wm.workspace_id = tasks.workspace_id
          and wm.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.workspaces w
        where w.id = tasks.workspace_id
          and w.created_by = auth.uid()
      )
    )
  )
);

-- Automatically create a profile and personal workspace for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace_id uuid;
begin
  insert into public.profiles (id, user_type)
  values (new.id, 'individual')
  on conflict (id) do nothing;

  insert into public.workspaces (name, board_type, created_by)
  values ('My Personal Board', 'personal', new.id)
  returning id into new_workspace_id;

  insert into public.workspace_memberships (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner')
  on conflict (workspace_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
