import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const mainSource = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
const attendanceSource = await readFile(new URL('../src/AttendanceModule.jsx', import.meta.url), 'utf8');

test('기능 사용 권한은 최고관리자 기본 설정 메뉴와 관리 메뉴에만 노출한다', () => {
  assert.match(mainSource, /isSuperAdmin\(user\).*go\('featureAccess'\).*기능 사용 권한/s);
  assert.match(mainSource, /isSuperAdmin\(user\).*setTab\('featureAccess'\).*기능 사용 권한/s);
  assert.match(mainSource, /tab === 'featureAccess' && isSuperAdmin\(user\)/);
});

test('근무 화면 내부 탭에는 기능 사용 권한을 두지 않는다', () => {
  const attendanceTabs = attendanceSource.match(/attendanceTopTabs[\s\S]*?<\/div>/)?.[0] || '';
  assert.doesNotMatch(attendanceTabs, /기능 사용 권한/);
  assert.match(attendanceTabs, /출근 현황/);
  assert.match(attendanceTabs, /매장 출근 설정/);
});
