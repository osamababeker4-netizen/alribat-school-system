-- Alribat School System production database baseline
create extension if not exists pgcrypto;

create table if not exists profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null,
 role text not null check(role in ('مدير النظام','مدير المدرسة','محاسب','أمين المستودع','مشرف/معلم')),
 active boolean not null default true
);
create table if not exists students(
 id uuid primary key default gen_random_uuid(),name text not null,grade text not null,class_name text,
 parent_name text,parent_phone text,status text not null default 'نشط' check(status in ('نشط','موقوف','منسحب')),
 created_at timestamptz not null default now()
);
create table if not exists fees(
 id uuid primary key default gen_random_uuid(),student_id uuid not null references students(id) on delete restrict,
 fee_type text not null,amount numeric(18,2) not null check(amount>0),due_date date,created_at timestamptz not null default now()
);
create table if not exists payments(
 id uuid primary key default gen_random_uuid(),receipt_number text unique not null,
 fee_id uuid not null references fees(id) on delete restrict,student_id uuid not null references students(id) on delete restrict,
 amount numeric(18,2) not null check(amount>0),payment_date date not null default current_date,payment_method text not null default 'نقدي'
);
create table if not exists expenses(
 id uuid primary key default gen_random_uuid(),title text not null,category text,
 amount numeric(18,2) not null check(amount>0),expense_date date not null default current_date,payee text
);
create table if not exists staff(
 id uuid primary key default gen_random_uuid(),name text not null,job_role text not null,phone text,
 salary numeric(18,2) not null default 0 check(salary>=0),status text not null default 'على رأس العمل'
);
create table if not exists attendance(
 id uuid primary key default gen_random_uuid(),student_id uuid not null references students(id) on delete cascade,
 attendance_date date not null,status text not null check(status in ('حاضر','غائب','متأخر','مأذون')),
 unique(student_id,attendance_date)
);
create table if not exists inventory_items(
 id uuid primary key default gen_random_uuid(),name text not null,sku text unique,category text,unit text,
 quantity numeric(18,3) not null default 0 check(quantity>=0),reorder_level numeric(18,3) not null default 0,
 unit_cost numeric(18,2) not null default 0
);
create table if not exists stock_movements(
 id uuid primary key default gen_random_uuid(),item_id uuid not null references inventory_items(id) on delete restrict,
 movement_type text not null check(movement_type in ('استلام','صرف')),quantity numeric(18,3) not null check(quantity>0),
 balance_after numeric(18,3) not null check(balance_after>=0),movement_date date not null default current_date,recipient text
);
create table if not exists requests(
 id uuid primary key default gen_random_uuid(),request_number text unique not null,title text not null,department text,
 priority text not null default 'عادية',details text,status text not null default 'قيد المراجعة'
 check(status in ('قيد المراجعة','معتمد','مرفوض','مكتمل','ملغي')),requester_id uuid references profiles(id)
);
create table if not exists audit_logs(
 id uuid primary key default gen_random_uuid(),actor_id uuid references profiles(id),action text not null,module text not null,
 description text not null,created_at timestamptz not null default now()
);

create or replace view fee_balances as
select f.id fee_id,f.student_id,f.amount,coalesce(sum(p.amount),0)::numeric(18,2) paid_amount,
 greatest(f.amount-coalesce(sum(p.amount),0),0)::numeric(18,2) balance
from fees f left join payments p on p.fee_id=f.id group by f.id;

create or replace function public.current_app_role() returns text language sql stable security definer set search_path=public as $$
 select role from profiles where id=auth.uid() and active=true
$$;

alter table profiles enable row level security;
alter table students enable row level security;
alter table fees enable row level security;
alter table payments enable row level security;
alter table expenses enable row level security;
alter table staff enable row level security;
alter table attendance enable row level security;
alter table inventory_items enable row level security;
alter table stock_movements enable row level security;
alter table requests enable row level security;
alter table audit_logs enable row level security;

create policy "active staff read students" on students for select to authenticated using(current_app_role() is not null);
create policy "management students" on students for all to authenticated using(current_app_role() in ('مدير النظام','مدير المدرسة')) with check(current_app_role() in ('مدير النظام','مدير المدرسة'));
create policy "finance fees" on fees for all to authenticated using(current_app_role() in ('مدير النظام','مدير المدرسة','محاسب')) with check(current_app_role() in ('مدير النظام','مدير المدرسة','محاسب'));
create policy "finance payments" on payments for all to authenticated using(current_app_role() in ('مدير النظام','مدير المدرسة','محاسب')) with check(current_app_role() in ('مدير النظام','مدير المدرسة','محاسب'));
create policy "finance expenses" on expenses for all to authenticated using(current_app_role() in ('مدير النظام','مدير المدرسة','محاسب')) with check(current_app_role() in ('مدير النظام','مدير المدرسة','محاسب'));
create policy "attendance staff" on attendance for all to authenticated using(current_app_role() in ('مدير النظام','مدير المدرسة','مشرف/معلم')) with check(current_app_role() in ('مدير النظام','مدير المدرسة','مشرف/معلم'));
create policy "inventory items" on inventory_items for all to authenticated using(current_app_role() in ('مدير النظام','مدير المدرسة','أمين المستودع')) with check(current_app_role() in ('مدير النظام','مدير المدرسة','أمين المستودع'));
create policy "inventory moves" on stock_movements for all to authenticated using(current_app_role() in ('مدير النظام','مدير المدرسة','أمين المستودع')) with check(current_app_role() in ('مدير النظام','مدير المدرسة','أمين المستودع'));
create policy "staff records" on staff for all to authenticated using(current_app_role() in ('مدير النظام','مدير المدرسة')) with check(current_app_role() in ('مدير النظام','مدير المدرسة'));
create policy "request read" on requests for select to authenticated using(current_app_role() is not null);
create policy "request create" on requests for insert to authenticated with check(current_app_role() is not null);
create policy "request approve" on requests for update to authenticated using(current_app_role() in ('مدير النظام','مدير المدرسة')) with check(current_app_role() in ('مدير النظام','مدير المدرسة'));
create policy "audit append" on audit_logs for insert to authenticated with check(actor_id=auth.uid());
create policy "audit management read" on audit_logs for select to authenticated using(current_app_role() in ('مدير النظام','مدير المدرسة'));
