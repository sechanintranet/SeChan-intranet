import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20260722063351_v29_63_feature_access_attendance.sql', import.meta.url), 'utf8');
const edge = await readFile(new URL('../supabase/functions/attendance-api/index.ts', import.meta.url), 'utf8');
const main = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
const vercel = await readFile(new URL('../vercel.json', import.meta.url), 'utf8');

test('출근 기록은 직원과 날짜 기준으로 한 번만 저장된다', () => {
  assert.match(migration, /unique\(employee_id, work_date\)/i);
  assert.match(edge, /error\.code === '23505'/);
});

test('출근 기록과 근무표 매핑은 브라우저에서 직접 수정할 수 없다', () => {
  assert.doesNotMatch(migration, /grant\s+(?:insert|update|delete)[\s\S]{0,120}attendance_records[\s\S]{0,30}to authenticated/i);
  assert.doesNotMatch(migration, /grant\s+(?:insert|update|delete)[\s\S]{0,120}attendance_schedule_entries[\s\S]{0,30}to authenticated/i);
  assert.match(migration, /grant all[\s\S]*attendance_records to service_role/i);
});

test('매장 좌표와 출근 상세는 브라우저가 직접 조회하지 않는다', () => {
  assert.doesNotMatch(migration, /grant select on[\s\S]{0,180}store_attendance_settings[\s\S]{0,40}to authenticated/i);
  assert.doesNotMatch(migration, /grant select on[\s\S]{0,180}attendance_records[\s\S]{0,40}to authenticated/i);
  assert.match(migration, /grant select on public\.feature_access_overrides to authenticated/i);
});

test('타 매장 승인과 당일 정오 제한은 서버에서 다시 확인한다', () => {
  assert.match(edge, /workDate === kst\.date && kst\.hour >= 12/);
  assert.match(edge, /점장 본인의 요청은 최고관리자만 승인/);
  assert.match(edge, /request\.home_store_name === actor\.store_name/);
});

test('기능 제한은 메뉴뿐 아니라 기존 업무 데이터 정책에도 적용된다', () => {
  assert.match(migration, /private\.can_use_feature\('happycall'\)/);
  assert.match(migration, /private\.can_use_feature\('freepass'\)/);
  assert.match(migration, /private\.can_use_feature\('accessories'\)/);
  assert.match(main, /featureKeyForTab\(tab\)/);
});

test('GPS는 브라우저에서 허용하되 서버가 매장 반경을 검증한다', () => {
  assert.match(edge, /distanceMeters\(/);
  assert.match(edge, /Number\(distance\) <= Number\(setting\.radius_meters\)/);
  assert.match(vercel, /geolocation=\(self\)/);
});

test('Google 서비스 계정 비밀값은 화면 코드에 포함하지 않는다', () => {
  assert.match(edge, /Deno\.env\.get\('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY'\)/);
  assert.doesNotMatch(main, /GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY/);
});

test('근무표는 고정 열만 믿지 않고 3행의 실제 날짜를 확인한다', () => {
  assert.match(edge, /const dateHeader = values\[2\]/);
  assert.match(edge, /dayFromSheetHeader\(value\) === day/);
  assert.match(edge, /근무표 3행에서/);
});

test('근무표 반영 실패는 출근 기록을 유지한 채 다시 시도할 수 있다', () => {
  assert.match(edge, /retry-sheet-sync/);
  assert.match(edge, /sheet_sync_attempts/);
  assert.match(edge, /근무표가 '.+'로 변경되어 자동 반영할 수 없습니다/);
});

test('기능을 끈 뒤 이미 열린 화면에서도 저장과 삭제가 차단된다', () => {
  assert.match(migration, /accessory_admin_delete[\s\S]*can_use_feature\('accessories'\)/);
  assert.match(migration, /freepass_requests_own_draft_delete[\s\S]*can_use_feature\('freepass'\)/);
  assert.match(migration, /freepass_ledger_admin_write[\s\S]*can_use_feature\('freepass'\)/);
  assert.match(migration, /targets_admin_insert[\s\S]*can_use_feature\('happycall'\)/);
  assert.match(migration, /targets_admin_delete[\s\S]*can_use_feature\('happycall'\)/);
});
