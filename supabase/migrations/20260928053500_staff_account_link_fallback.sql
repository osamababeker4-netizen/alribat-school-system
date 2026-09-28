-- Ensure every active non-school-manager account can resolve a stable attendance identity.
-- Existing explicit staff links still win; this is only a fallback.
create or replace function private.staff_for_current_user(p_staff jsonb)
returns jsonb language plpgsql security definer stable
set search_path = pg_catalog
as $$
declare
  v_profile public.profiles%rowtype;
  v_staff jsonb;
begin
  select * into v_profile
    from public.profiles
   where user_id=auth.uid() and active=true;
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

  if v_staff is null and v_profile.role <> 'مدير المدرسة' then
    v_staff := jsonb_build_object(
      'id','account-'||v_profile.user_id::text,
      'authId',v_profile.user_id::text,
      'name',v_profile.full_name,
      'role',v_profile.role,
      'status','نشط',
      '_accountLinked',true
    );
  end if;
  return v_staff;
end;
$$;

revoke all on function private.staff_for_current_user(jsonb) from public, anon, authenticated;
