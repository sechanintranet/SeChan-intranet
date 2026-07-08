-- 세찬컴퍼니 인트라넷 V29.29 SQL
-- 1) 직원별 퇴근시간 저장 컬럼
alter table employees
add column if not exists end_time text default '20:00';

-- 2) 권장: 프리패스 최종승인 중복 ledger 생성 DB 레벨 차단
-- 기존 freepass_ledger.source_request_id 중복값이 있으면 먼저 정리 후 실행하세요.
create unique index if not exists freepass_ledger_source_request_id_unique
on freepass_ledger(source_request_id)
where source_request_id is not null;
