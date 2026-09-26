-- Alribat School System — canonical production schema snapshot
-- Synced with Supabase production on 2026-09-26.
-- This is a bootstrap/reference snapshot. Production changes should be applied as migrations.

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

create table if not exists public.profiles(
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  role text not null default 'مشرف/معلم'
    check(role in ('مدير النظام','مدير المدرسة','محاسب','أمين المستودع','مشرف/معلم')),
  active boolean not null default true,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_phone_unique
on public.profiles(phone) where phone is not null and phone<>'';

create table if not exists public.school_modules(
  module text primary key,
  data jsonb not null default '[]'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  version bigint not null default 0,
  constraint allowed_module check(module in (
    'school','students','fees','payments','expenses','staff','attendance',
    'inventory','moves','requests','audit','notifications','grades'
  ))
);

create index if not exists school_modules_updated_by_idx
on public.school_modules(updated_by);

create table if not exists private.bootstrap_config(
  singleton boolean primary key default true check(singleton),
  admin_email_hash text not null
);

create table if not exists private.user_invites(
  email_hash text primary key,
  phone text,
  full_name text not null,
  role text not null check(role in ('مدير النظام','مدير المدرسة','محاسب','أمين المستودع','مشرف/معلم')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create index if not exists user_invites_invited_by_idx
on private.user_invites(invited_by);

create table if not exists private.school_module_history(
  id bigint generated always as identity primary key,
  module text not null,
  data jsonb not null,
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create index if not exists school_module_history_module_time_idx
on private.school_module_history(module,changed_at desc);

create or replace function private.current_school_role()
returns text language sql stable security definer
set search_path to 'public','private'
as $$
  select role from public.profiles
  where user_id=auth.uid() and active=true
  limit 1
$$;

create or replace function private.can_read_school_module(m text)
returns boolean language sql stable security definer
set search_path to 'public','private'
as $$
 select case private.current_school_role()
   when 'مدير النظام' then true
   when 'مدير المدرسة' then true
   when 'محاسب' then m in ('school','students','fees','payments','expenses','audit','notifications')
   when 'أمين المستودع' then m in ('school','inventory','moves','requests','audit','notifications')
   when 'مشرف/معلم' then m in ('school','students','attendance','grades','requests','audit','notifications')
   else false end
$$;

create or replace function private.can_write_school_module(m text)
returns boolean language sql stable security definer
set search_path to 'public','private'
as $$
 select case private.current_school_role()
   when 'مدير النظام' then true
   when 'مدير المدرسة' then true
   when 'محاسب' then m in ('students','fees','payments','expenses','audit','notifications')
   when 'أمين المستودع' then m in ('inventory','moves','requests','audit','notifications')
   when 'مشرف/معلم' then m in ('students','attendance','grades','requests','audit','notifications')
   else false end
$$;

create or replace function private.save_school_module_impl(
  p_module text,p_data jsonb,p_expected_version bigint
) returns bigint language plpgsql security definer
set search_path to 'public','private'
as $$
declare new_version bigint;
begin
  if not private.can_write_school_module(p_module) then
    raise exception 'غير مصرح بتعديل هذه الوحدة';
  end if;
  update public.school_modules
     set data=p_data,updated_by=auth.uid(),updated_at=now(),version=version+1
   where module=p_module and version=p_expected_version
   returning version into new_version;
  if new_version is null then
    raise exception 'DATA_CONFLICT: تم تعديل البيانات من مستخدم آخر. أعد تحميل البيانات ثم حاول مجددًا.';
  end if;
  return new_version;
end;
$$;

create or replace function public.save_school_module(
  p_module text,p_data jsonb,p_expected_version bigint
) returns bigint language sql
set search_path to 'public','private'
as $$ select private.save_school_module_impl(p_module,p_data,p_expected_version) $$;

create or replace function private.invite_school_user_impl(
  p_email text,p_phone text,p_full_name text,p_role text
) returns boolean language plpgsql security definer
set search_path to 'public','private','extensions'
as $$
declare h text; normalized_phone text;
begin
  if private.current_school_role() not in ('مدير النظام','مدير المدرسة') then
    raise exception 'غير مصرح';
  end if;
  if p_role not in ('مدير النظام','مدير المدرسة','محاسب','أمين المستودع','مشرف/معلم') then
    raise exception 'دور غير صالح';
  end if;
  h := encode(extensions.digest(lower(trim(p_email)),'sha256'),'hex');
  normalized_phone := regexp_replace(coalesce(p_phone,''),'[^0-9+]','','g');
  insert into private.user_invites(email_hash,phone,full_name,role,invited_by,used_at)
  values(
    h,nullif(normalized_phone,''),
    coalesce(nullif(trim(p_full_name),''),split_part(lower(trim(p_email)),'@',1)),
    p_role,auth.uid(),null
  )
  on conflict(email_hash) do update set
    phone=excluded.phone,full_name=excluded.full_name,role=excluded.role,
    invited_by=excluded.invited_by,created_at=now(),used_at=null;
  return true;
end;
$$;

create or replace function public.invite_school_user_v2(
  p_email text,p_phone text,p_full_name text,p_role text
) returns boolean language sql
set search_path to 'public','private'
as $$ select private.invite_school_user_impl(p_email,p_phone,p_full_name,p_role) $$;

create or replace function private.update_my_phone_impl(p_phone text)
returns boolean language plpgsql security definer
set search_path to 'public','private'
as $$
declare normalized text;
begin
  if auth.uid() is null then raise exception 'غير مصرح'; end if;
  normalized := regexp_replace(coalesce(p_phone,''),'[^0-9+]','','g');
  if normalized='' then normalized:=null; end if;
  update public.profiles set phone=normalized,updated_at=now() where user_id=auth.uid();
  if not found then raise exception 'الحساب غير موجود'; end if;
  return true;
end;
$$;

create or replace function public.update_my_phone(p_phone text)
returns boolean language sql
set search_path to 'public','private'
as $$ select private.update_my_phone_impl(p_phone) $$;

create or replace function private.set_school_user_active_impl(
  p_user_id uuid,p_active boolean
) returns boolean language plpgsql security definer
set search_path to 'public','private'
as $$
begin
  if auth.uid() is null or private.current_school_role() not in ('مدير النظام','مدير المدرسة') then
    raise exception 'غير مصرح';
  end if;
  if p_user_id=auth.uid() and p_active=false then
    raise exception 'لا يمكنك إيقاف حسابك الحالي';
  end if;
  update public.profiles set active=p_active,updated_at=now() where user_id=p_user_id;
  if not found then raise exception 'المستخدم غير موجود'; end if;
  return true;
end;
$$;

create or replace function public.set_school_user_active(
  p_user_id uuid,p_active boolean
) returns boolean language sql
set search_path to 'public','private'
as $$ select private.set_school_user_active_impl(p_user_id,p_active) $$;

create or replace function private.handle_new_school_user()
returns trigger language plpgsql security definer
set search_path to 'public','private','extensions'
as $$
declare
  h text; profile_count bigint; boot_hash text; inv private.user_invites%rowtype;
  chosen_role text; chosen_name text; chosen_phone text;
begin
  h := encode(extensions.digest(lower(trim(new.email)),'sha256'),'hex');
  select count(*) into profile_count from public.profiles;
  if profile_count=0 then
    select admin_email_hash into boot_hash from private.bootstrap_config where singleton=true;
    if boot_hash is null or h<>boot_hash then
      raise exception 'هذا البريد غير مخول لتأسيس حساب الإدارة';
    end if;
    chosen_role := 'مدير النظام';
    chosen_name := coalesce(nullif(new.raw_user_meta_data->>'full_name',''),'مدير النظام');
    chosen_phone := nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'phone',''),'[^0-9+]','','g'),'');
  else
    select * into inv from private.user_invites where email_hash=h and used_at is null;
    if not found then raise exception 'لا توجد دعوة فعالة لهذا البريد'; end if;
    chosen_role := inv.role;
    chosen_name := inv.full_name;
    chosen_phone := inv.phone;
    update private.user_invites set used_at=now() where email_hash=h;
  end if;
  insert into public.profiles(user_id,full_name,email,role,active,must_change_password,phone)
  values(new.id,chosen_name,lower(trim(new.email)),chosen_role,true,false,chosen_phone);
  return new;
end;
$$;

create or replace function private.capture_school_module_history()
returns trigger language plpgsql security definer
set search_path to 'public','private'
as $$
begin
  if old.data is distinct from new.data then
    insert into private.school_module_history(module,data,changed_by,changed_at)
    values(old.module,old.data,auth.uid(),now());
    delete from private.school_module_history h
    where h.module=old.module
      and h.id not in (
        select id from private.school_module_history
        where module=old.module order by changed_at desc,id desc limit 50
      );
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_alribat on auth.users;
create trigger on_auth_user_created_alribat
after insert on auth.users
for each row execute function private.handle_new_school_user();

drop trigger if exists school_modules_history_trigger on public.school_modules;
create trigger school_modules_history_trigger
before update on public.school_modules
for each row execute function private.capture_school_module_history();

alter table public.profiles enable row level security;
alter table public.school_modules enable row level security;

drop policy if exists "profiles role read" on public.profiles;
create policy "profiles role read"
on public.profiles for select to authenticated
using (
  user_id=(select auth.uid())
  or private.current_school_role() in ('مدير النظام','مدير المدرسة')
);

drop policy if exists "modules role read" on public.school_modules;
create policy "modules role read"
on public.school_modules for select to authenticated
using (private.can_read_school_module(module));

revoke all privileges on table public.profiles from anon,authenticated;
revoke all privileges on table public.school_modules from anon,authenticated;
grant select on table public.profiles to authenticated;
grant select on table public.school_modules to authenticated;

revoke all on schema private from public,anon;
grant usage on schema private to authenticated;
revoke all on all tables in schema private from public,anon,authenticated;
revoke execute on all functions in schema private from public,anon,authenticated;

grant execute on function private.current_school_role() to authenticated;
grant execute on function private.can_read_school_module(text) to authenticated;
grant execute on function private.can_write_school_module(text) to authenticated;
grant execute on function private.save_school_module_impl(text,jsonb,bigint) to authenticated;
grant execute on function private.invite_school_user_impl(text,text,text,text) to authenticated;
grant execute on function private.update_my_phone_impl(text) to authenticated;
grant execute on function private.set_school_user_active_impl(uuid,boolean) to authenticated;

revoke all on function public.save_school_module(text,jsonb,bigint) from public,anon;
revoke all on function public.invite_school_user_v2(text,text,text,text) from public,anon;
revoke all on function public.update_my_phone(text) from public,anon;
revoke all on function public.set_school_user_active(uuid,boolean) from public,anon;
grant execute on function public.save_school_module(text,jsonb,bigint) to authenticated;
grant execute on function public.invite_school_user_v2(text,text,text,text) to authenticated;
grant execute on function public.update_my_phone(text) to authenticated;
grant execute on function public.set_school_user_active(uuid,boolean) to authenticated;

insert into public.school_modules(module,data) values
('school',jsonb_build_object(
  'name','مدرسة الرباط',
  'fullName','مدرسة الرباط الأساسية المختلطة الخاصة',
  'currency','جنيه سوداني',
  'academicYear','2026/2027',
  'phone','',
  'email','',
  'address','PORT SUDAN',
  'logoUrl','./alribat-seal.svg',
  'subjects',jsonb_build_array('اللغة العربية','اللغة الإنجليزية','الرياضيات','العلوم','الدراسات الإسلامية','الدراسات الاجتماعية'),
  'gradeScale',jsonb_build_array(
    jsonb_build_object('min',85,'label','ممتاز'),
    jsonb_build_object('min',75,'label','جيد جداً'),
    jsonb_build_object('min',65,'label','جيد'),
    jsonb_build_object('min',50,'label','مقبول'),
    jsonb_build_object('min',0,'label','راسب')
  )
)),
('students','[]'::jsonb),
('fees','[]'::jsonb),
('payments','[]'::jsonb),
('expenses','[]'::jsonb),
('staff','[]'::jsonb),
('attendance','[]'::jsonb),
('inventory','[]'::jsonb),
('moves','[]'::jsonb),
('requests','[]'::jsonb),
('grades','[]'::jsonb),
('audit','[]'::jsonb),
('notifications','[]'::jsonb)
on conflict(module) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='school_modules'
  ) then
    alter publication supabase_realtime add table public.school_modules;
  end if;
end
$$;

-- Bootstrap note:
-- Before the very first account is created in a fresh environment, insert exactly one
-- private.bootstrap_config row containing the SHA-256 hash of the authorized admin email.
-- Production already has this row; no secret/hash value is stored in this repository.
