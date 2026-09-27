-- Native Android geofenced attendance and server-side audit retention.
-- All attendance decisions are made here, never trusted solely to the phone.

create or replace function private.alribat_normalize_name(p_value text)
returns text language sql immutable as $$
  select lower(regexp_replace(
    translate(coalesce(p_value,''),'أإآٱىة','اااايه'),
    '[^[:alnum:]]','','g'
  ))
$$;

create or replace function private.alribat_normalize_phone(p_value text)
returns text language sql immutable as $$
  select regexp_replace(coalesce(p_value,''),'[^0-9]','','g')
$$;

create or replace function private.purge_audit_if_due()
returns boolean language plpgsql security definer
set search_path to 'public','private'
as $$
declare
  v_school jsonb;
  v_audit jsonb;
  v_hours numeric;
  v_last timestamptz;
begin
  select data into v_school from public.school_modules where module='school' for update;
  select data into v_audit from public.school_modules where module='audit' for update;
  v_hours := coalesce(nullif(v_school->>'auditPurgeHours','')::numeric,0);
  if v_hours <= 0 or coalesce(jsonb_array_length(v_audit),0)=0 then return false; end if;
  v_last := nullif(v_school->>'auditLastPurgeAt','')::timestamptz;
  if v_last is not null and now() < v_last + make_interval(secs => v_hours * 3600) then return false; end if;

  update public.school_modules
     set data='[]'::jsonb, updated_at=now(), version=version+1
   where module='audit';
  update public.school_modules
     set data=jsonb_set(coalesce(v_school,'{}'::jsonb),'{auditLastPurgeAt}',to_jsonb(now()::text),true),
         updated_at=now(), version=version+1
   where module='school';
  return true;
end;
$$;

create or replace function private.staff_for_current_user(p_staff jsonb)
returns jsonb language plpgsql security definer stable
set search_path to 'public','private'
as $$
declare
  v_profile public.profiles%rowtype;
  v_staff jsonb;
begin
  select * into v_profile from public.profiles where user_id=auth.uid() and active=true;
  if not found then return null; end if;
  select item into v_staff
    from jsonb_array_elements(coalesce(p_staff,'[]'::jsonb)) item
   where coalesce(item->>'status','نشط') <> 'منتهي'
     and (
       nullif(item->>'authId','')=v_profile.user_id::text or
       (nullif(private.alribat_normalize_phone(item->>'phone'),'') is not null and
        private.alribat_normalize_phone(item->>'phone')=private.alribat_normalize_phone(v_profile.phone)) or
       (nullif(private.alribat_normalize_name(item->>'name'),'') is not null and
        private.alribat_normalize_name(item->>'name')=private.alribat_normalize_name(v_profile.full_name))
     )
   limit 1;
  return v_staff;
end;
$$;

create or replace function public.get_my_staff_geofence()
returns jsonb language plpgsql security definer
set search_path to 'public','private'
as $$
declare
  v_role text;
  v_school jsonb;
  v_staff jsonb;
  v_geo jsonb;
begin
  perform private.purge_audit_if_due();
  select role into v_role from public.profiles where user_id=auth.uid() and active=true;
  if v_role is null then raise exception 'الحساب غير مصرح له'; end if;
  select data into v_school from public.school_modules where module='school';
  select private.staff_for_current_user(data) into v_staff from public.school_modules where module='staff';
  v_geo := coalesce(v_school->'geofence','{}'::jsonb);
  return jsonb_build_object(
    'excluded',v_role='مدير المدرسة',
    'linked',v_staff is not null,
    'staffId',v_staff->>'id', 'staffName',v_staff->>'name', 'role',v_role,
    'lat',v_geo->>'lat', 'lng',v_geo->>'lng',
    'radiusM',coalesce((v_geo->>'radiusM')::numeric,120),
    'exitBufferM',coalesce((v_geo->>'exitBufferM')::numeric,25),
    'maxAccuracyM',coalesce((v_geo->>'maxAccuracyM')::numeric,80)
  );
end;
$$;

create or replace function public.record_staff_geofence_event(
  p_event text, p_lat double precision, p_lng double precision,
  p_accuracy double precision, p_device_id text default null
) returns jsonb language plpgsql security definer
set search_path to 'public','private'
as $$
declare
  v_role text; v_school jsonb; v_staff jsonb; v_geo jsonb; v_list jsonb; v_audit jsonb;
  v_lat double precision; v_lng double precision; v_radius numeric; v_buffer numeric; v_max_accuracy numeric;
  v_distance numeric; v_today text := to_char(now() at time zone 'Africa/Khartoum','YYYY-MM-DD');
  v_time text := to_char(now() at time zone 'Africa/Khartoum','HH24:MI'); v_existing jsonb; v_next jsonb;
  v_event_geo jsonb; v_stamp text := now()::text;
begin
  if p_event not in ('enter','exit') then raise exception 'حدث حضور غير صالح'; end if;
  if p_lat not between -90 and 90 or p_lng not between -180 and 180 or p_accuracy <= 0 then raise exception 'إحداثيات غير صالحة'; end if;
  perform private.purge_audit_if_due();
  select role into v_role from public.profiles where user_id=auth.uid() and active=true;
  if v_role is null then raise exception 'الحساب غير مصرح له'; end if;
  if v_role='مدير المدرسة' then raise exception 'مدير المدرسة مستثنى من الحضور التلقائي'; end if;
  select data into v_school from public.school_modules where module='school';
  select data into v_list from public.school_modules where module='staffAttendance' for update;
  select private.staff_for_current_user(data) into v_staff from public.school_modules where module='staff';
  if v_staff is null then raise exception 'الحساب غير مرتبط بسجل موظف'; end if;
  v_geo:=coalesce(v_school->'geofence','{}'::jsonb);
  v_lat:=nullif(v_geo->>'lat','')::double precision; v_lng:=nullif(v_geo->>'lng','')::double precision;
  if v_lat is null or v_lng is null then raise exception 'لم يعتمد موقع المدرسة بعد'; end if;
  v_radius:=greatest(20,coalesce(nullif(v_geo->>'radiusM','')::numeric,120));
  v_buffer:=greatest(10,coalesce(nullif(v_geo->>'exitBufferM','')::numeric,25));
  v_max_accuracy:=greatest(20,coalesce(nullif(v_geo->>'maxAccuracyM','')::numeric,80));
  if p_accuracy > v_max_accuracy then raise exception 'دقة الموقع غير كافية'; end if;
  v_distance:=6371000 * acos(least(1.0,greatest(-1.0,
    sin(radians(v_lat))*sin(radians(p_lat))+cos(radians(v_lat))*cos(radians(p_lat))*cos(radians(p_lng-v_lng))
  )));
  if (p_event='enter' and v_distance>v_radius) or (p_event='exit' and v_distance<v_radius+v_buffer) then
    raise exception 'الموقع خارج شرط التسجيل';
  end if;
  select item into v_existing from jsonb_array_elements(coalesce(v_list,'[]'::jsonb)) item
   where item->>'staffId'=v_staff->>'id' and item->>'date'=v_today limit 1;
  if p_event='enter' and coalesce(v_existing->>'checkIn','')<>'' then return jsonb_build_object('accepted',false,'reason','already_checked_in'); end if;
  if p_event='exit' and (coalesce(v_existing->>'checkIn','')='' or coalesce(v_existing->>'checkOut','')<>'') then return jsonb_build_object('accepted',false,'reason','invalid_check_out'); end if;
  v_event_geo:=jsonb_build_object('lat',p_lat,'lng',p_lng,'accuracy',p_accuracy,'distance',round(v_distance),'at',v_stamp,'mode','native-geofence','deviceId',left(coalesce(p_device_id,''),128));
  v_next:=coalesce(v_existing,jsonb_build_object('id','satt-native-'||replace(gen_random_uuid()::text,'-',''),'staffId',v_staff->>'id','staffName',v_staff->>'name','role',v_staff->>'role','date',v_today,'status','حاضر','checkIn','','checkOut','','notes',''));
  if p_event='enter' then v_next:=v_next || jsonb_build_object('status','حاضر','checkIn',v_time,'checkInGeo',v_event_geo,'autoCheckIn',true,'updatedAt',v_stamp);
  else v_next:=v_next || jsonb_build_object('checkOut',v_time,'checkOutGeo',v_event_geo,'autoCheckOut',true,'updatedAt',v_stamp); end if;
  v_list:=coalesce(v_list,'[]'::jsonb);
  if v_existing is null then v_list:=v_list || jsonb_build_array(v_next);
  else v_list:=(select coalesce(jsonb_agg(case when item->>'id'=v_existing->>'id' then v_next else item end),'[]'::jsonb) from jsonb_array_elements(v_list) item); end if;
  update public.school_modules set data=v_list,updated_by=auth.uid(),updated_at=now(),version=version+1 where module='staffAttendance';
  select data into v_audit from public.school_modules where module='audit' for update;
  v_audit:=jsonb_build_array(jsonb_build_object('id','audit-native-'||replace(gen_random_uuid()::text,'-',''),'at',v_stamp,'action',case when p_event='enter' then 'حضور تلقائي' else 'انصراف تلقائي' end,'module','حضور الموظفين','description',(case when p_event='enter' then 'حضور تلقائي ' else 'انصراف تلقائي ' end)||coalesce(v_staff->>'name','')||' — '||round(v_distance)::text||'م من مركز المدرسة','user',coalesce(v_staff->>'name',''))) || coalesce(v_audit,'[]'::jsonb);
  update public.school_modules set data=(select coalesce(jsonb_agg(item),'[]'::jsonb) from (select item from jsonb_array_elements(v_audit) item limit 1000) s),updated_by=auth.uid(),updated_at=now(),version=version+1 where module='audit';
  return jsonb_build_object('accepted',true,'event',p_event,'distanceM',round(v_distance),'at',v_stamp);
end;
$$;

revoke all on function public.get_my_staff_geofence() from public;
revoke all on function public.record_staff_geofence_event(text,double precision,double precision,double precision,text) from public;
grant execute on function public.get_my_staff_geofence() to authenticated;
grant execute on function public.record_staff_geofence_event(text,double precision,double precision,double precision,text) to authenticated;

-- Run once a minute. The function itself respects the administrator's configured interval.
do $$
begin
  if exists(select 1 from pg_namespace where nspname='cron') then
    perform cron.unschedule(jobid) from cron.job where jobname='alribat-audit-retention';
    perform cron.schedule('alribat-audit-retention','* * * * *','select private.purge_audit_if_due()');
  end if;
exception when others then
  raise notice 'Audit retention scheduler was not installed: %', sqlerrm;
end $$;
