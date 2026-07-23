create or replace function public.record_employee_login_failure(p_employee_id uuid)
returns table (
  failure_count integer,
  lock_stage integer,
  locked_until timestamptz,
  admin_reset_required boolean
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  current_state public.employee_login_lock_state%rowtype;
  next_count integer;
  v_now timestamptz := now();
begin
  insert into public.employee_login_lock_state (employee_id)
  values (p_employee_id)
  on conflict (employee_id) do nothing;

  select *
  into current_state
  from public.employee_login_lock_state
  where employee_id = p_employee_id
  for update;

  if current_state.admin_reset_required or current_state.lock_stage = 2 then
    update public.employee_login_lock_state
    set
      lock_stage = 2,
      admin_reset_required = true,
      locked_until = null,
      updated_at = v_now
    where employee_id = p_employee_id
    returning * into current_state;
    failure_count := current_state.failure_count;
    lock_stage := current_state.lock_stage;
    locked_until := current_state.locked_until;
    admin_reset_required := current_state.admin_reset_required;
    return next;
    return;
  end if;

  if current_state.lock_stage = 0 then
    next_count := current_state.failure_count + 1;
    if next_count >= 8 then
      update public.employee_login_lock_state
      set
        failure_count = 0,
        lock_stage = 1,
        locked_until = v_now + interval '3 minutes',
        admin_reset_required = false,
        updated_at = v_now
      where employee_id = p_employee_id
      returning * into current_state;
    else
      update public.employee_login_lock_state
      set failure_count = next_count, updated_at = v_now
      where employee_id = p_employee_id
      returning * into current_state;
    end if;
  else
    next_count := current_state.failure_count + 1;
    if next_count >= 8 then
      update public.employee_login_lock_state
      set
        failure_count = 0,
        lock_stage = 2,
        locked_until = null,
        admin_reset_required = true,
        updated_at = v_now
      where employee_id = p_employee_id
      returning * into current_state;
    else
      update public.employee_login_lock_state
      set
        failure_count = next_count,
        locked_until = null,
        updated_at = v_now
      where employee_id = p_employee_id
      returning * into current_state;
    end if;
  end if;

  failure_count := current_state.failure_count;
  lock_stage := current_state.lock_stage;
  locked_until := current_state.locked_until;
  admin_reset_required := current_state.admin_reset_required;
  return next;
end;
$$;

revoke all on function public.record_employee_login_failure(uuid) from public, anon, authenticated;
grant execute on function public.record_employee_login_failure(uuid) to service_role;
