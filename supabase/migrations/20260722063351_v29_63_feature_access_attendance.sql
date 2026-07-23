-- V29.63: feature rollout controls and attendance foundation.
-- Existing modules default to enabled. Attendance defaults to disabled until a superadmin opens it.

create table public.feature_access_overrides (
  id uuid primary key default gen_random_uuid(),
  scope_type text not null check (scope_type in ('employee', 'store')),
  employee_id uuid references public.employees(id) on delete cascade,
  store_id uuid references public.stores(id) on delete cascade,
  feature_key text not null check (feature_key in ('happycall', 'freepass', 'accessories', 'attendance')),
  enabled boolean not null,
  updated_by uuid references public.employees(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint feature_access_scope_check check (
    (scope_type = 'employee' and employee_id is not null and store_id is null)
    or (scope_type = 'store' and store_id is not null and employee_id is null)
  )
);

create unique index feature_access_employee_unique
  on public.feature_access_overrides(employee_id, feature_key)
  where scope_type = 'employee';
create unique index feature_access_store_unique
  on public.feature_access_overrides(store_id, feature_key)
  where scope_type = 'store';

create table public.store_attendance_settings (
  store_id uuid primary key references public.stores(id) on delete cascade,
  enabled boolean not null default false,
  auth_mode text not null default 'either' check (auth_mode in ('wifi', 'gps', 'either')),
  latitude double precision,
  longitude double precision,
  radius_meters integer not null default 100 check (radius_meters between 30 and 1000),
  default_start_time time,
  updated_by uuid references public.employees(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint attendance_coordinates_pair check (
    (latitude is null and longitude is null)
    or (latitude between -90 and 90 and longitude between -180 and 180)
  )
);

create table public.store_attendance_ips (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  ip_address inet not null,
  label text not null default '',
  active boolean not null default true,
  created_by uuid references public.employees(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(store_id, ip_address)
);

create table public.attendance_other_store_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  employee_name text not null,
  work_date date not null,
  home_store_id uuid not null references public.stores(id),
  home_store_name text not null,
  destination_store_id uuid not null references public.stores(id),
  destination_store_name text not null,
  reason text not null check (char_length(trim(reason)) between 2 and 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled', 'used', 'expired')),
  requested_at timestamptz not null default now(),
  decided_by uuid references public.employees(id) on delete set null,
  decided_by_name text,
  decided_at timestamptz,
  decision_note text,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (home_store_id <> destination_store_id)
);

create unique index attendance_other_store_active_unique
  on public.attendance_other_store_requests(employee_id, work_date)
  where status in ('pending', 'approved');
create index attendance_other_store_approval_idx
  on public.attendance_other_store_requests(home_store_id, status, work_date);

create table public.attendance_schedule_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null,
  sheet_value text not null default '',
  is_day_off boolean not null default false,
  source_sheet text not null,
  source_cell text not null,
  synced_at timestamptz not null default now(),
  unique(employee_id, work_date)
);

create table public.attendance_sheet_employee_mappings (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  sheet_name text not null,
  sheet_row integer not null check (sheet_row >= 1),
  employee_name_snapshot text not null,
  store_name_snapshot text not null,
  verified_at timestamptz not null default now(),
  verified_by uuid references public.employees(id) on delete set null,
  unique(employee_id, sheet_name),
  unique(sheet_name, sheet_row)
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  employee_name text not null,
  work_date date not null,
  home_store_id uuid not null references public.stores(id),
  home_store_name text not null,
  checkin_store_id uuid not null references public.stores(id),
  checkin_store_name text not null,
  checked_in_at timestamptz not null default now(),
  verification_method text not null check (verification_method in ('wifi', 'gps')),
  client_ip inet,
  distance_meters integer,
  gps_accuracy_meters integer,
  other_store_request_id uuid references public.attendance_other_store_requests(id) on delete set null,
  sheet_sync_status text not null default 'pending' check (sheet_sync_status in ('pending', 'synced', 'failed', 'not_configured')),
  sheet_sync_attempts integer not null default 0,
  sheet_sync_error text,
  sheet_synced_at timestamptz,
  sheet_name text,
  sheet_cell text,
  created_at timestamptz not null default now(),
  unique(employee_id, work_date)
);

create index attendance_records_date_store_idx on public.attendance_records(work_date, checkin_store_id);
create index attendance_schedule_date_idx on public.attendance_schedule_entries(work_date, employee_id);

alter table public.feature_access_overrides enable row level security;
alter table public.store_attendance_settings enable row level security;
alter table public.store_attendance_ips enable row level security;
alter table public.attendance_other_store_requests enable row level security;
alter table public.attendance_schedule_entries enable row level security;
alter table public.attendance_sheet_employee_mappings enable row level security;
alter table public.attendance_records enable row level security;

revoke all on public.feature_access_overrides, public.store_attendance_settings,
  public.store_attendance_ips, public.attendance_other_store_requests,
  public.attendance_schedule_entries, public.attendance_sheet_employee_mappings,
  public.attendance_records
  from public, anon, authenticated;

-- The browser only reads its effective feature overrides. Attendance writes and
-- detailed attendance/location reads go through the authenticated Edge Function.
grant select on public.feature_access_overrides to authenticated;
grant all on public.feature_access_overrides, public.store_attendance_settings,
  public.store_attendance_ips, public.attendance_other_store_requests,
  public.attendance_schedule_entries, public.attendance_sheet_employee_mappings,
  public.attendance_records to service_role;

create or replace function private.feature_default(target_feature text)
returns boolean language sql immutable set search_path = ''
as $$ select target_feature in ('happycall', 'freepass', 'accessories') $$;

create or replace function private.can_use_feature(target_feature text)
returns boolean language sql stable security definer set search_path = ''
as $$
  with actor as (
    select e.id, e.store_name
    from public.employees e
    where e.auth_user_id = (select auth.uid()) and e.status = '재직'
    limit 1
  ), actor_store as (
    select s.id from public.stores s, actor a where s.name = a.store_name limit 1
  )
  select case
    when not exists (select 1 from actor) then false
    else coalesce(
      (select f.enabled from public.feature_access_overrides f, actor a
       where f.scope_type = 'employee' and f.employee_id = a.id and f.feature_key = target_feature),
      (select f.enabled from public.feature_access_overrides f, actor_store s
       where f.scope_type = 'store' and f.store_id = s.id and f.feature_key = target_feature),
      private.feature_default(target_feature)
    )
  end
$$;

revoke all on function private.feature_default(text) from public, anon;
revoke all on function private.can_use_feature(text) from public, anon;
grant execute on function private.feature_default(text), private.can_use_feature(text) to authenticated;

drop policy if exists feature_access_read on public.feature_access_overrides;
create policy feature_access_read on public.feature_access_overrides for select to authenticated
using (
  private.is_super_admin()
  or employee_id = private.current_employee_id()
  or (scope_type = 'store' and store_id = (select s.id from public.stores s where s.name = private.current_employee_store() limit 1))
);
drop policy if exists feature_access_superadmin_write on public.feature_access_overrides;
create policy feature_access_superadmin_write on public.feature_access_overrides for all to authenticated
using (private.is_super_admin()) with check (private.is_super_admin() and updated_by = private.current_employee_id());

drop policy if exists attendance_settings_read on public.store_attendance_settings;
create policy attendance_settings_read on public.store_attendance_settings for select to authenticated
using (private.is_active_employee());
drop policy if exists attendance_settings_superadmin_write on public.store_attendance_settings;
create policy attendance_settings_superadmin_write on public.store_attendance_settings for all to authenticated
using (private.is_super_admin()) with check (private.is_super_admin() and updated_by = private.current_employee_id());

drop policy if exists attendance_ips_read on public.store_attendance_ips;
create policy attendance_ips_read on public.store_attendance_ips for select to authenticated
using (private.is_super_admin());
drop policy if exists attendance_ips_superadmin_write on public.store_attendance_ips;
create policy attendance_ips_superadmin_write on public.store_attendance_ips for all to authenticated
using (private.is_super_admin()) with check (private.is_super_admin() and created_by = private.current_employee_id());

drop policy if exists other_store_requests_read on public.attendance_other_store_requests;
create policy other_store_requests_read on public.attendance_other_store_requests for select to authenticated
using (
  employee_id = private.current_employee_id()
  or private.is_super_admin()
  or (private.is_manager() and home_store_name = private.current_employee_store())
);

drop policy if exists attendance_schedule_read on public.attendance_schedule_entries;
create policy attendance_schedule_read on public.attendance_schedule_entries for select to authenticated
using (
  employee_id = private.current_employee_id()
  or private.is_admin_like()
  or (private.is_manager() and exists (
    select 1 from public.employees e
    where e.id = attendance_schedule_entries.employee_id and e.store_name = private.current_employee_store()
  ))
);

drop policy if exists attendance_sheet_mappings_read on public.attendance_sheet_employee_mappings;
create policy attendance_sheet_mappings_read on public.attendance_sheet_employee_mappings for select to authenticated
using (employee_id = private.current_employee_id() or private.is_super_admin());

drop policy if exists attendance_records_read on public.attendance_records;
create policy attendance_records_read on public.attendance_records for select to authenticated
using (
  employee_id = private.current_employee_id()
  or private.is_admin_like()
  or (private.is_manager() and (home_store_name = private.current_employee_store() or checkin_store_name = private.current_employee_store()))
);

-- Apply feature gates to existing business data. Existing defaults keep current access unchanged.
create or replace function private.can_access_happycall_target(target_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.can_use_feature('happycall') and exists (
    select 1 from public.happycall_targets t
    where t.id = target_id
      and private.is_active_employee()
      and (
        private.is_admin_like()
        or coalesce(t.temporary_assignee, t.assigned_employee) = private.current_employee_name()
        or (private.is_manager() and t.assigned_store = private.current_employee_store())
        or private.can_review_store(t.assigned_store)
      )
  )
$$;

-- Preserve the existing role/store/assignee rules and add the feature switch
-- as an outer gate. Defaults are enabled, so this does not change current work
-- until a superadmin explicitly disables Happycall for a store or employee.
drop policy if exists targets_scope_select on public.happycall_targets;
create policy targets_scope_select on public.happycall_targets for select to authenticated
using (
  private.can_use_feature('happycall')
  and private.is_active_employee()
  and (
    private.is_admin_like()
    or coalesce(temporary_assignee, assigned_employee) = private.current_employee_name()
    or (private.is_manager() and assigned_store = private.current_employee_store())
    or private.can_review_store(assigned_store)
  )
);

drop policy if exists targets_scope_update on public.happycall_targets;
create policy targets_scope_update on public.happycall_targets for update to authenticated
using (
  private.can_use_feature('happycall')
  and private.is_active_employee()
  and (
    private.is_admin_like()
    or coalesce(temporary_assignee, assigned_employee) = private.current_employee_name()
    or (private.is_manager() and assigned_store = private.current_employee_store())
    or private.can_review_store(assigned_store)
  )
)
with check (
  private.can_use_feature('happycall')
  and private.is_active_employee()
  and (
    private.is_admin_like()
    or coalesce(temporary_assignee, assigned_employee) = private.current_employee_name()
    or (private.is_manager() and assigned_store = private.current_employee_store())
  )
);

drop policy if exists accessory_scope_select on public.accessory_orders;
create policy accessory_scope_select on public.accessory_orders for select to authenticated
using (private.can_use_feature('accessories') and (private.is_admin_like() or employee_id = private.current_employee_id() or store_name = private.current_employee_store()));
drop policy if exists accessory_actor_insert on public.accessory_orders;
create policy accessory_actor_insert on public.accessory_orders for insert to authenticated
with check (private.can_use_feature('accessories') and private.is_active_employee() and employee_id = private.current_employee_id() and employee_name = private.current_employee_name() and store_name = private.current_employee_store());
drop policy if exists accessory_scope_update on public.accessory_orders;
create policy accessory_scope_update on public.accessory_orders for update to authenticated
using (private.can_use_feature('accessories') and (private.is_admin_like() or employee_id = private.current_employee_id() or store_name = private.current_employee_store()))
with check (private.can_use_feature('accessories') and (private.is_admin_like() or employee_id = private.current_employee_id() or store_name = private.current_employee_store()));
drop policy if exists accessory_admin_delete on public.accessory_orders;
create policy accessory_admin_delete on public.accessory_orders for delete to authenticated
using (private.can_use_feature('accessories') and private.is_admin_like());

drop policy if exists freepass_requests_scope_select on public.freepass_requests;
create policy freepass_requests_scope_select on public.freepass_requests for select to authenticated
using (private.can_use_feature('freepass') and (private.is_admin_like() or employee_id = private.current_employee_id() or employee_name = private.current_employee_name()
  or (private.is_manager() and employee_store = private.current_employee_store())));
drop policy if exists freepass_requests_own_insert on public.freepass_requests;
create policy freepass_requests_own_insert on public.freepass_requests for insert to authenticated
with check (private.can_use_feature('freepass') and private.is_active_employee() and employee_id = private.current_employee_id() and employee_name = private.current_employee_name());
drop policy if exists freepass_requests_scope_update on public.freepass_requests;
create policy freepass_requests_scope_update on public.freepass_requests for update to authenticated
using (private.can_use_feature('freepass') and (private.is_admin_like() or employee_id = private.current_employee_id() or employee_name = private.current_employee_name()
  or (private.is_manager() and employee_store = private.current_employee_store())))
with check (private.can_use_feature('freepass') and (private.is_admin_like() or employee_id = private.current_employee_id() or employee_name = private.current_employee_name()
  or (private.is_manager() and employee_store = private.current_employee_store())));
drop policy if exists freepass_requests_own_draft_delete on public.freepass_requests;
create policy freepass_requests_own_draft_delete on public.freepass_requests for delete to authenticated
using (private.can_use_feature('freepass') and private.is_active_employee() and employee_id = private.current_employee_id() and status = '임시저장');
drop policy if exists freepass_ledger_scope_select on public.freepass_ledger;
create policy freepass_ledger_scope_select on public.freepass_ledger for select to authenticated
using (private.can_use_feature('freepass') and (private.is_admin_like() or employee_id = private.current_employee_id() or employee_name = private.current_employee_name()
  or (private.is_manager() and employee_store = private.current_employee_store())));
drop policy if exists freepass_ledger_admin_write on public.freepass_ledger;
create policy freepass_ledger_admin_write on public.freepass_ledger for all to authenticated
using (private.can_use_feature('freepass') and private.is_admin_like())
with check (private.can_use_feature('freepass') and private.is_admin_like());

drop policy if exists targets_admin_insert on public.happycall_targets;
create policy targets_admin_insert on public.happycall_targets for insert to authenticated
with check (private.can_use_feature('happycall') and private.is_admin_like());
drop policy if exists targets_admin_delete on public.happycall_targets;
create policy targets_admin_delete on public.happycall_targets for delete to authenticated
using (private.can_use_feature('happycall') and private.current_employee_role() = '관리자');

comment on table public.feature_access_overrides is 'Feature rollout overrides. Employee rules take priority over store rules.';
comment on table public.attendance_records is 'Server-verified attendance records. Client-side direct writes are intentionally not granted.';
