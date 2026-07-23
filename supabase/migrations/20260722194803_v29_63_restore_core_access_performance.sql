-- V29.63 emergency recovery
-- Restore the V29.62 core RLS behaviour. Feature access remains stored for the
-- upcoming UI, but it is not evaluated once per business row while the
-- permission design is reworked.

drop policy if exists targets_scope_select on public.happycall_targets;
create policy targets_scope_select
on public.happycall_targets
for select
to authenticated
using (
  (select private.is_active_employee())
  and (
    (select private.is_admin_like())
    or coalesce(temporary_assignee, assigned_employee) = (select private.current_employee_name())
    or (
      (select private.is_manager())
      and assigned_store = (select private.current_employee_store())
    )
    or private.can_review_store(assigned_store)
  )
);

drop policy if exists targets_scope_update on public.happycall_targets;
create policy targets_scope_update
on public.happycall_targets
for update
to authenticated
using (
  (select private.is_active_employee())
  and (
    (select private.is_admin_like())
    or coalesce(temporary_assignee, assigned_employee) = (select private.current_employee_name())
    or (
      (select private.is_manager())
      and assigned_store = (select private.current_employee_store())
    )
    or private.can_review_store(assigned_store)
  )
)
with check (
  (select private.is_active_employee())
  and (
    (select private.is_admin_like())
    or coalesce(temporary_assignee, assigned_employee) = (select private.current_employee_name())
    or (
      (select private.is_manager())
      and assigned_store = (select private.current_employee_store())
    )
  )
);

drop policy if exists targets_admin_insert on public.happycall_targets;
create policy targets_admin_insert
on public.happycall_targets
for insert
to authenticated
with check ((select private.is_admin_like()));

drop policy if exists targets_admin_delete on public.happycall_targets;
create policy targets_admin_delete
on public.happycall_targets
for delete
to authenticated
using ((select private.current_employee_role()) = '관리자');

drop policy if exists accessory_scope_select on public.accessory_orders;
create policy accessory_scope_select on public.accessory_orders for select to authenticated
using (private.is_admin_like() or employee_id = private.current_employee_id() or store_name = private.current_employee_store());

drop policy if exists accessory_actor_insert on public.accessory_orders;
create policy accessory_actor_insert on public.accessory_orders for insert to authenticated
with check (private.is_active_employee() and employee_id = private.current_employee_id() and employee_name = private.current_employee_name() and store_name = private.current_employee_store());

drop policy if exists accessory_scope_update on public.accessory_orders;
create policy accessory_scope_update on public.accessory_orders for update to authenticated
using (private.is_admin_like() or employee_id = private.current_employee_id() or store_name = private.current_employee_store())
with check (private.is_admin_like() or employee_id = private.current_employee_id() or store_name = private.current_employee_store());

drop policy if exists accessory_admin_delete on public.accessory_orders;
create policy accessory_admin_delete on public.accessory_orders for delete to authenticated
using (private.is_admin_like());

drop policy if exists freepass_requests_scope_select on public.freepass_requests;
create policy freepass_requests_scope_select on public.freepass_requests for select to authenticated
using (private.is_admin_like() or employee_id = private.current_employee_id() or employee_name = private.current_employee_name()
  or (private.is_manager() and employee_store = private.current_employee_store()));

drop policy if exists freepass_requests_own_insert on public.freepass_requests;
create policy freepass_requests_own_insert on public.freepass_requests for insert to authenticated
with check (private.is_active_employee() and employee_id = private.current_employee_id() and employee_name = private.current_employee_name());

drop policy if exists freepass_requests_scope_update on public.freepass_requests;
create policy freepass_requests_scope_update on public.freepass_requests for update to authenticated
using (private.is_admin_like() or employee_id = private.current_employee_id() or employee_name = private.current_employee_name()
  or (private.is_manager() and employee_store = private.current_employee_store()))
with check (private.is_admin_like() or employee_id = private.current_employee_id() or employee_name = private.current_employee_name()
  or (private.is_manager() and employee_store = private.current_employee_store()));

drop policy if exists freepass_requests_own_draft_delete on public.freepass_requests;
create policy freepass_requests_own_draft_delete on public.freepass_requests for delete to authenticated
using (private.is_active_employee() and employee_id = private.current_employee_id() and status = '임시저장');

drop policy if exists freepass_ledger_scope_select on public.freepass_ledger;
create policy freepass_ledger_scope_select on public.freepass_ledger for select to authenticated
using (private.is_admin_like() or employee_id = private.current_employee_id() or employee_name = private.current_employee_name()
  or (private.is_manager() and employee_store = private.current_employee_store()));

drop policy if exists freepass_ledger_admin_write on public.freepass_ledger;
create policy freepass_ledger_admin_write on public.freepass_ledger for all to authenticated
using (private.is_admin_like())
with check (private.is_admin_like());
