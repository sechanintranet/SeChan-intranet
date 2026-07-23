import test from 'node:test';
import assert from 'node:assert/strict';
import {
  attendanceAvailability, canRequestOtherStore, distanceMeters,
  isScheduleDayOff, spreadsheetColumnForDay, spreadsheetTabCandidates
} from '../src/attendanceRules.js';

test('휴무 계열 표기를 휴무로 판정한다', () => {
  ['휴무', '유휴1', '유후3', '후무', '연차2', '월차3', '당직휴무', '휴가', 'X'].forEach(value => {
    assert.equal(isScheduleDayOff(value), true, value);
  });
  assert.equal(isScheduleDayOff('09:55'), false);
  assert.equal(isScheduleDayOff(''), false);
});

test('스프레드시트 날짜 열은 1일 G부터 계산한다', () => {
  assert.equal(spreadsheetColumnForDay(1), 'G');
  assert.equal(spreadsheetColumnForDay(15), 'U');
  assert.equal(spreadsheetColumnForDay(31), 'AK');
});

test('월 탭 이름의 띄어쓰기 차이를 모두 허용한다', () => {
  assert.deepEqual(spreadsheetTabCandidates('2026-07-22'), ['26년7월', '26년 7월']);
});

test('정오 이후 당일 타 매장 요청은 차단하고 미래 요청은 허용한다', () => {
  assert.equal(canRequestOtherStore({ now: '2026-07-22T02:59:00Z', workDate: '2026-07-22' }), true);
  assert.equal(canRequestOtherStore({ now: '2026-07-22T03:00:00Z', workDate: '2026-07-22' }), false);
  assert.equal(canRequestOtherStore({ now: '2026-07-22T05:00:00Z', workDate: '2026-07-23' }), true);
});

test('매장 거리와 출근 가능 조건을 계산한다', () => {
  assert.ok(distanceMeters(
    { latitude: 37.0, longitude: 126.0 },
    { latitude: 37.0005, longitude: 126.0005 }
  ) < 100);
  assert.deepEqual(attendanceAvailability({
    featureEnabled: true, activeEmployee: true, scheduleValue: '', alreadyCheckedIn: false, locationVerified: true
  }), { enabled: true, reason: '' });
});
