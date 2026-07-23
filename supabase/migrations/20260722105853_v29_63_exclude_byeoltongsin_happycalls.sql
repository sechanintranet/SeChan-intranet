-- 별통신 고객은 해피콜 업무 대상이 아니므로 기존 생성 건을 숨기고
-- 가입번호 기준 통화불가 고객 목록에 한 번만 등록한다.
with byeoltongsin_customers as (
  select distinct on (c.join_no)
    c.join_no,
    c.customer_name
  from public.customers c
  where regexp_replace(coalesce(c.store_name, ''), '\s+', '', 'g') = '별통신'
     or regexp_replace(coalesce(c.raw_store_name, ''), '\s+', '', 'g') = '별통신'
  order by c.join_no, c.open_date desc, c.created_at desc
)
update public.happycall_targets target
set
  is_skipped = true,
  skip_reason = case
    when coalesce(target.skip_reason, '') like '%별통신 매장 제외%' then target.skip_reason
    when nullif(trim(coalesce(target.skip_reason, '')), '') is null then '별통신 매장 제외'
    else target.skip_reason || ' / 별통신 매장 제외'
  end
from byeoltongsin_customers customer
where target.join_no = customer.join_no
  and coalesce(target.is_skipped, false) = false;

with byeoltongsin_customers as (
  select distinct on (c.join_no)
    c.join_no,
    c.customer_name
  from public.customers c
  where regexp_replace(coalesce(c.store_name, ''), '\s+', '', 'g') = '별통신'
     or regexp_replace(coalesce(c.raw_store_name, ''), '\s+', '', 'g') = '별통신'
  order by c.join_no, c.open_date desc, c.created_at desc
)
insert into public.refused_customers (
  join_no,
  target_id,
  refused_by,
  refused_at,
  memo,
  customer_name,
  is_minor
)
select
  customer.join_no,
  latest_target.id,
  '시스템',
  now(),
  '매장 제외: 별통신',
  customer.customer_name,
  false
from byeoltongsin_customers customer
left join lateral (
  select target.id
  from public.happycall_targets target
  where target.join_no = customer.join_no
  order by target.created_at desc, target.id desc
  limit 1
) latest_target on true
where not exists (
  select 1
  from public.refused_customers refused
  where refused.join_no = customer.join_no
);

insert into public.audit_logs (action, target_type, target_id, actor_name, detail)
select
  '해피콜 매장 제외 일괄 반영',
  'store',
  '별통신',
  '시스템',
  '별통신 고객을 해피콜 생성 대상에서 제외하고 기존 생성 건을 통화불가 고객 목록으로 전환'
where not exists (
  select 1
  from public.audit_logs
  where action = '해피콜 매장 제외 일괄 반영'
    and target_type = 'store'
    and target_id = '별통신'
);
