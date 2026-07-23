import test from 'node:test';
import assert from 'node:assert/strict';
import { FEATURE_KEYS, resolveAllFeatureAccess, resolveFeatureAccess } from '../src/featureAccess.js';

test('기존 기능은 기본 허용하고 근무 기능은 기본 차단한다', () => {
  const access = resolveAllFeatureAccess({ employeeId: 'e1', storeId: 's1', overrides: [] });
  assert.equal(access.happycall.enabled, true);
  assert.equal(access.freepass.enabled, true);
  assert.equal(access.accessories.enabled, true);
  assert.equal(access.attendance.enabled, false);
});

test('직원 설정은 매장 설정보다 우선한다', () => {
  const result = resolveFeatureAccess({
    featureKey: FEATURE_KEYS.ATTENDANCE,
    employeeId: 'e1', storeId: 's1',
    overrides: [
      { scope_type: 'store', store_id: 's1', feature_key: 'attendance', enabled: false },
      { scope_type: 'employee', employee_id: 'e1', feature_key: 'attendance', enabled: true }
    ]
  });
  assert.deepEqual(result, { enabled: true, source: 'employee' });
});
