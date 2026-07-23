-- V29.63 follow-up: browser writes are intentionally unavailable, so the
-- redundant write policies are removed. The Edge Function uses service_role.
drop policy if exists feature_access_superadmin_write on public.feature_access_overrides;
drop policy if exists attendance_settings_superadmin_write on public.store_attendance_settings;
drop policy if exists attendance_ips_superadmin_write on public.store_attendance_ips;

-- Cover attendance foreign keys used during employee/store maintenance.
create index if not exists attendance_other_store_decided_by_idx
  on public.attendance_other_store_requests(decided_by);
create index if not exists attendance_other_store_destination_idx
  on public.attendance_other_store_requests(destination_store_id);
create index if not exists attendance_records_checkin_store_idx
  on public.attendance_records(checkin_store_id);
create index if not exists attendance_records_home_store_idx
  on public.attendance_records(home_store_id);
create index if not exists attendance_records_other_request_idx
  on public.attendance_records(other_store_request_id);
create index if not exists attendance_sheet_mappings_verified_by_idx
  on public.attendance_sheet_employee_mappings(verified_by);
create index if not exists feature_access_updated_by_idx
  on public.feature_access_overrides(updated_by);
create index if not exists store_attendance_ips_created_by_idx
  on public.store_attendance_ips(created_by);
create index if not exists store_attendance_settings_updated_by_idx
  on public.store_attendance_settings(updated_by);
