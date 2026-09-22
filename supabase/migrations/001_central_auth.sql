-- Alribat School System — central auth/database baseline (Supabase)
-- Apply this migration to the production Supabase project.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'مشرف/معلم'
    check (role in ('مدير النظام','مدير المدرسة','محاسب','أمين المستودع','مشرف/معلم')),
  active boolean not null default true,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_modules (
  module text primary key,
  data jsonb not null default '[]'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint allowed_module check (module in (
    'school','students','fees','payments','expenses','staff','attendance',
    'inventory','moves','requests','audit','notifications'
  ))
);

create or replace function public.current_school_role()
returns text
language sql
stable
security definer
set search_path=public
as $$
  select role from public.profiles
  where user_id=auth.uid() and active=true
  limit 1
$$;

create or replace function public.can_read_school_module(m text)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select case public.current_school_role()
    when 'مدير النظام' then true
    when 'مدير المدرسة' then true
    when 'محاسب' then m in ('school','students','fees','payments','expenses','audit','notifications')
    when 'أمين المستودع' then m in ('school','inventory','moves','requests','audit','notifications')
    when 'مشرف/معلم' then m in ('school','students','attendance','requests','audit','notifications')
    else false
  end
$$;

create or replace function public.can_write_school_module(m text)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select case public.current_school_role()
    when 'مدير النظام' then true
    when 'مدير المدرسة' then true
    when 'محاسب' then m in ('students','fees','payments','expenses','audit','notifications')
    when 'أمين المستودع' then m in ('inventory','moves','requests','audit','notifications')
    when 'مشرف/معلم' then m in ('students','attendance','requests','audit','notifications')
    else false
  end
$$;

alter table public.profiles enable row level security;
alter table public.school_modules enable row level security;

drop policy if exists "profile self read" on public.profiles;
create policy "profile self read"
on public.profiles for select to authenticated
using (user_id=auth.uid());

drop policy if exists "management profiles read" on public.profiles;
create policy "management profiles read"
on public.profiles for select to authenticated
using (public.current_school_role() in ('مدير النظام','مدير المدرسة'));

drop policy if exists "management profiles update" on public.profiles;
create policy "management profiles update"
on public.profiles for update to authenticated
using (public.current_school_role() in ('مدير النظام','مدير المدرسة'))
with check (public.current_school_role() in ('مدير النظام','مدير المدرسة'));

drop policy if exists "modules role read" on public.school_modules;
create policy "modules role read"
on public.school_modules for select to authenticated
using (public.can_read_school_module(module));

drop policy if exists "modules role insert" on public.school_modules;
create policy "modules role insert"
on public.school_modules for insert to authenticated
with check (public.can_write_school_module(module) and updated_by=auth.uid());

drop policy if exists "modules role update" on public.school_modules;
create policy "modules role update"
on public.school_modules for update to authenticated
using (public.can_write_school_module(module))
with check (public.can_write_school_module(module) and updated_by=auth.uid());

create or replace function public.handle_new_school_user()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.profiles(user_id,full_name,role,active,must_change_password)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''),split_part(new.email,'@',1)),
    'مشرف/معلم',
    true,
    false
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_alribat on auth.users;
create trigger on_auth_user_created_alribat
after insert on auth.users
for each row execute function public.handle_new_school_user();

insert into public.school_modules(module,data) values
 ('school','{"name":"مدرسة الرباط","currency":"جنيه سوداني","academicYear":"2026/2027"}'::jsonb),
 ('students','[]'::jsonb),
 ('fees','[]'::jsonb),
 ('payments','[]'::jsonb),
 ('expenses','[]'::jsonb),
 ('staff','[]'::jsonb),
 ('attendance','[]'::jsonb),
 ('inventory','[]'::jsonb),
 ('moves','[]'::jsonb),
 ('requests','[]'::jsonb),
 ('audit','[]'::jsonb),
 ('notifications','[]'::jsonb)
on conflict (module) do nothing;
