-- v1.5.0: employee attendance central module
alter table public.school_modules drop constraint if exists allowed_module;
alter table public.school_modules add constraint allowed_module check(module in (
  'school','students','fees','payments','expenses','staff','staffAttendance','attendance',
  'inventory','moves','requests','audit','notifications','grades'
));

insert into public.school_modules(module,data)
values ('staffAttendance','[]'::jsonb)
on conflict(module) do nothing;
