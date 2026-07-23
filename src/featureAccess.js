export const FEATURE_KEYS = Object.freeze({
  HAPPYCALL: 'happycall',
  FREEPASS: 'freepass',
  ACCESSORIES: 'accessories',
  ATTENDANCE: 'attendance'
});

export const FEATURE_DEFINITIONS = Object.freeze([
  { key: FEATURE_KEYS.HAPPYCALL, label: '해피콜', defaultEnabled: true },
  { key: FEATURE_KEYS.FREEPASS, label: '프리패스', defaultEnabled: true },
  { key: FEATURE_KEYS.ACCESSORIES, label: '악세사리 주문', defaultEnabled: true },
  { key: FEATURE_KEYS.ATTENDANCE, label: '근무', defaultEnabled: false }
]);

const DEFAULTS = Object.freeze(Object.fromEntries(
  FEATURE_DEFINITIONS.map(feature => [feature.key, feature.defaultEnabled])
));

export function featureDefault(featureKey) {
  return DEFAULTS[featureKey] ?? false;
}

export function resolveFeatureAccess({ featureKey, employeeId, storeId, overrides = [] }) {
  const employeeOverride = overrides.find(row =>
    row?.feature_key === featureKey && row?.scope_type === 'employee' && row?.employee_id === employeeId
  );
  if (employeeOverride) return { enabled: employeeOverride.enabled === true, source: 'employee' };

  const storeOverride = overrides.find(row =>
    row?.feature_key === featureKey && row?.scope_type === 'store' && row?.store_id === storeId
  );
  if (storeOverride) return { enabled: storeOverride.enabled === true, source: 'store' };

  return { enabled: featureDefault(featureKey), source: 'default' };
}

export function resolveAllFeatureAccess({ employeeId, storeId, overrides = [] }) {
  return Object.fromEntries(FEATURE_DEFINITIONS.map(feature => [
    feature.key,
    resolveFeatureAccess({ featureKey: feature.key, employeeId, storeId, overrides })
  ]));
}

export function featureKeyForTab(tab) {
  if (['mycalls', 'manager', 'storecalls', 'storePerformance', 'review', 'performance', 'allcalls', 'assignmentStatus', 'refused', 'rawupload', 'targetgen'].includes(tab)) {
    return FEATURE_KEYS.HAPPYCALL;
  }
  if (tab === 'freepass') return FEATURE_KEYS.FREEPASS;
  if (tab === 'accessories') return FEATURE_KEYS.ACCESSORIES;
  if (tab === 'attendance') return FEATURE_KEYS.ATTENDANCE;
  return null;
}
