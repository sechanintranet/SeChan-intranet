import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const attendance = await readFile(new URL('../src/AttendanceModule.jsx', import.meta.url), 'utf8');
const edge = await readFile(new URL('../supabase/functions/attendance-api/index.ts', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/migrations/20260724190000_v29_65_attendance_today_retention.sql', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

test('당일 출근 내역은 관리자와 최고관리자에게만 제공한다', () => {
  assert.match(attendance, /canViewTodayAttendance = user\.role === '관리자' \|\| superAdmin/);
  assert.match(edge, /if \(!isAdminLike\(actor\)\) return json\(403/);
  assert.match(edge, /actor\.role === '관리자' \|\| isSuperAdmin\(actor\)/);
});

test('당일 내역은 한국 날짜 기준으로 오늘 기록만 조회한다', () => {
  assert.match(edge, /async function todayAttendance/);
  assert.match(edge, /\.eq\('work_date', today\)/);
  assert.match(edge, /\.order\('checked_in_at', \{ ascending: true \}\)/);
  assert.match(attendance, /오늘 출근/);
  assert.match(attendance, /반영 완료/);
  assert.match(attendance, /반영 중/);
  assert.match(attendance, /반영 실패/);
});

test('관리자는 실패한 구글 근무표 반영을 다시 시도할 수 있다', () => {
  assert.match(edge, /record\.employee_id === actor\.id \|\| isAdminLike\(actor\)/);
  assert.match(attendance, /retry-sheet-sync/);
  assert.match(attendance, /다시 반영/);
});

test('전일 정리는 반영 완료 기록만 매일 한국 자정 이후 삭제한다', () => {
  assert.match(migration, /cron\.schedule/);
  assert.match(migration, /'10 15 \* \* \*'/);
  assert.match(migration, /work_date < \(now\(\) at time zone 'Asia\/Seoul'\)::date/);
  assert.match(migration, /sheet_sync_status = 'synced'/);
  assert.doesNotMatch(migration, /sheet_sync_status\s+in\s*\([^)]*failed/i);
});

test('PC 표와 모바일 카드형 당일 출근 내역을 각각 제공한다', () => {
  assert.match(attendance, /attendanceDesktopTable/);
  assert.match(attendance, /attendanceTodayMobile/);
  assert.match(styles, /\.attendanceTodaySummary/);
  assert.match(styles, /\.attendanceSyncBadge\.synced/);
  assert.match(styles, /\.attendanceSyncBadge\.failed/);
});

test('출근은 WiFi를 먼저 확인하고 필요할 때만 GPS를 요청한다', () => {
  const checkIn = attendance.match(/async function checkIn\(\)[\s\S]*?async function submitOtherStore/)?.[0] || '';
  assert.match(checkIn, /invokeAttendance\(supabase, \{ action: 'check-in' \}\)/);
  assert.match(checkIn, /const location = await getLocation\(\)/);
  assert.ok(checkIn.indexOf("action: 'check-in'") < checkIn.indexOf('getLocation()'));
  assert.match(checkIn, /alert\('출근 처리가 완료되었습니다\.'\)/);
});

test('타 매장 승인은 출근 현황과 분리된 탭으로 표시한다', () => {
  assert.match(attendance, /\{ key: 'approvals', label: '타 매장 출근 승인', show: canApprove \}/);
  assert.match(attendance, /view === 'approvals' && canApprove/);
});

