const DAY_OFF_PREFIXES = ['휴무', '후무', '유휴', '유후', '연차', '월차', '당직휴무', '휴가'];

export function normalizeScheduleValue(value) {
  return String(value ?? '').trim().replace(/\s+/g, '');
}

export function isScheduleDayOff(value) {
  const normalized = normalizeScheduleValue(value);
  if (!normalized) return false;
  if (normalized.toUpperCase() === 'X') return true;
  return DAY_OFF_PREFIXES.some(prefix => normalized.startsWith(prefix));
}

export function isTimeValue(value) {
  const normalized = normalizeScheduleValue(value);
  if (!normalized) return false;
  return /^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(normalized);
}

export function spreadsheetColumnForDay(day) {
  const numericDay = Number(day);
  if (!Number.isInteger(numericDay) || numericDay < 1 || numericDay > 31) {
    throw new Error('날짜는 1일부터 31일 사이여야 합니다.');
  }
  let index = 7 + numericDay - 1;
  let label = '';
  while (index > 0) {
    const remainder = (index - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    index = Math.floor((index - 1) / 26);
  }
  return label;
}

export function spreadsheetTabCandidates(dateValue) {
  const match = String(dateValue || '').match(/^(\d{4})-(\d{2})-/);
  if (!match) return [];
  const year = match[1].slice(-2);
  const month = Number(match[2]);
  return [`${year}년${month}월`, `${year}년 ${month}월`];
}

export function distanceMeters(origin, destination) {
  const lat1 = Number(origin?.latitude);
  const lon1 = Number(origin?.longitude);
  const lat2 = Number(destination?.latitude);
  const lon2 = Number(destination?.longitude);
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return Number.POSITIVE_INFINITY;
  const toRadians = degree => degree * Math.PI / 180;
  const earthRadius = 6371000;
  const latitudeDelta = toRadians(lat2 - lat1);
  const longitudeDelta = toRadians(lon2 - lon1);
  const a = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function canRequestOtherStore({ now, workDate, cutoffHour = 12 }) {
  const current = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(current.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(workDate)) return false;
  const koreaParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23'
  }).formatToParts(current).reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  const today = `${koreaParts.year}-${koreaParts.month}-${koreaParts.day}`;
  if (workDate < today) return false;
  if (workDate > today) return true;
  return Number(koreaParts.hour) < cutoffHour;
}

export function attendanceAvailability({ featureEnabled, activeEmployee, scheduleValue, alreadyCheckedIn, locationVerified }) {
  if (!featureEnabled) return { enabled: false, reason: '근무 기능 사용 권한이 없습니다.' };
  if (!activeEmployee) return { enabled: false, reason: '재직 중인 직원만 출근할 수 있습니다.' };
  if (isScheduleDayOff(scheduleValue)) return { enabled: false, reason: '오늘은 휴무로 등록되어 있습니다.' };
  if (alreadyCheckedIn) return { enabled: false, reason: '오늘 출근 처리가 이미 완료되었습니다.' };
  if (!locationVerified) return { enabled: false, reason: '매장 WiFi 또는 위치 확인이 필요합니다.' };
  return { enabled: true, reason: '' };
}
