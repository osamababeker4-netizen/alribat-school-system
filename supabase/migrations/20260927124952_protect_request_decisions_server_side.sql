-- Protect request approvals/decisions at the database boundary.
-- Non-manager roles may append a new pending request only; existing requests
-- cannot be edited/deleted and a new request cannot self-approve.

create or replace function private.save_school_module_impl(
  p_module text,
  p_data jsonb,
  p_expected_version bigint
)
returns bigint
language plpgsql
security definer
set search_path = public, private
as $$
declare
  new_version bigint;
  v_role text;
  v_old jsonb;
  v_name text;
begin
  v_role := private.current_school_role();

  if not private.can_write_school_module(p_module) then
    raise exception 'غير مصرح بتعديل هذه الوحدة';
  end if;

  if p_module = 'requests'
     and v_role not in ('مدير النظام','مدير المدرسة') then

    select data into v_old
      from public.school_modules
     where module='requests';

    select full_name into v_name
      from public.profiles
     where user_id=auth.uid() and active=true
     limit 1;

    if exists (
      select 1
        from jsonb_array_elements(coalesce(v_old,'[]'::jsonb)) old_item
       where not exists (
         select 1
           from jsonb_array_elements(coalesce(p_data,'[]'::jsonb)) new_item
          where new_item->>'id'=old_item->>'id'
            and new_item=old_item
       )
    ) then
      raise exception 'غير مصرح بتعديل أو حذف طلب قائم';
    end if;

    if exists (
      select 1
        from jsonb_array_elements(coalesce(p_data,'[]'::jsonb)) new_item
       where not exists (
         select 1
           from jsonb_array_elements(coalesce(v_old,'[]'::jsonb)) old_item
          where old_item->>'id'=new_item->>'id'
       )
         and (
           coalesce(new_item->>'id','')=''
           or coalesce(new_item->>'title','')=''
           or coalesce(new_item->>'status','')<>'قيد المراجعة'
           or coalesce(new_item->>'decisionBy','')<>''
           or coalesce(new_item->>'requester','')<>coalesce(v_name,'')
         )
    ) then
      raise exception 'الطلب الجديد يجب أن يكون قيد المراجعة وباسم المستخدم الحالي';
    end if;

    if (
      select count(*)
        from jsonb_array_elements(coalesce(p_data,'[]'::jsonb))
    ) <> (
      select count(distinct item->>'id')
        from jsonb_array_elements(coalesce(p_data,'[]'::jsonb)) item
    ) then
      raise exception 'لا يسمح بتكرار رقم تعريف الطلب';
    end if;
  end if;

  update public.school_modules
     set data=p_data,
         updated_by=auth.uid(),
         updated_at=now(),
         version=version+1
   where module=p_module
     and version=p_expected_version
  returning version into new_version;

  if new_version is null then
    raise exception 'DATA_CONFLICT: تم تعديل البيانات من مستخدم آخر. أعد تحميل البيانات ثم حاول مجددًا.';
  end if;

  return new_version;
end;
$$;
