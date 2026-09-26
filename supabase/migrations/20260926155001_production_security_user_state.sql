-- Applied to production Supabase on 2026-09-26.
-- Aligns grades, user-state RPCs and least-privilege Data API access.

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists email text;
create unique index if not exists profiles_phone_unique
on public.profiles(phone) where phone is not null and phone<>'';

alter table public.school_modules add column if not exists version bigint not null default 0;
alter table public.school_modules drop constraint if exists allowed_module;
alter table public.school_modules add constraint allowed_module check(module in (
  'school','students','fees','payments','expenses','staff','attendance',
  'inventory','moves','requests','audit','notifications','grades'
));
insert into public.school_modules(module,data)
values ('grades','[]'::jsonb) on conflict(module) do nothing;

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

create or replace function private.set_school_user_active_impl(p_user_id uuid,p_active boolean)
returns boolean language plpgsql security definer
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

create or replace function public.set_school_user_active(p_user_id uuid,p_active boolean)
returns boolean language sql
set search_path to 'public','private'
as $$ select private.set_school_user_active_impl(p_user_id,p_active) $$;

drop policy if exists "management profiles update" on public.profiles;

revoke all privileges on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
revoke all privileges on table public.school_modules from authenticated;
grant select on table public.school_modules to authenticated;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.current_school_role() to authenticated;
grant execute on function private.can_read_school_module(text) to authenticated;
grant execute on function private.can_write_school_module(text) to authenticated;
grant execute on function private.save_school_module_impl(text,jsonb,bigint) to authenticated;
grant execute on function private.invite_school_user_impl(text,text,text,text) to authenticated;
grant execute on function private.update_my_phone_impl(text) to authenticated;
grant execute on function private.set_school_user_active_impl(uuid,boolean) to authenticated;

revoke all on function public.save_school_module(text,jsonb,bigint) from public, anon;
grant execute on function public.save_school_module(text,jsonb,bigint) to authenticated;
revoke all on function public.invite_school_user_v2(text,text,text,text) from public, anon;
grant execute on function public.invite_school_user_v2(text,text,text,text) to authenticated;
revoke all on function public.update_my_phone(text) from public, anon;
grant execute on function public.update_my_phone(text) to authenticated;
revoke all on function public.set_school_user_active(uuid,boolean) from public, anon;
grant execute on function public.set_school_user_active(uuid,boolean) to authenticated;
