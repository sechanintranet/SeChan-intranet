function compactText(value) {
  return String(value || '').replace(/\s+/g, '').trim();
}

export function normalizeAssignmentStore(value) {
  const text = compactText(value);
  if (text.includes('지축')) return '지축';
  return String(value || '').trim();
}

export function sanitizeStoredEmployee(employee) {
  if (!employee || typeof employee !== 'object') return null;
  const { password: _password, ...safeEmployee } = employee;
  return safeEmployee;
}

export function isActiveEmployeeSession(employee) {
  return Boolean(employee?.id && employee?.status === '재직');
}

export function resolveJichukRetiredSellerRule({ customerStore, sellerName, employees = [] }) {
  if (normalizeAssignmentStore(customerStore) !== '지축') return null;

  const normalizedSellerName = compactText(sellerName);
  const sellerRows = employees.filter(employee => compactText(employee?.name) === normalizedSellerName);
  const activeSeller = sellerRows.find(employee => employee?.status === '재직');
  if (activeSeller) return null;

  const imJiha = employees.find(employee =>
    compactText(employee?.name) === '임지하' &&
    employee?.status === '재직' &&
    employee?.happycall_assignment_enabled !== false
  );

  if (!imJiha) {
    return {
      assigned_store: '지축',
      assigned_employee: '',
      reason: '지축 판매 / 퇴사 판매자 / 임지하 지정 배정 불가'
    };
  }

  return {
    assigned_store: normalizeAssignmentStore(imJiha.store_name) || imJiha.store_name || '지축',
    assigned_employee: imJiha.name,
    reason: '지축 판매 / 퇴사 판매자 / 임지하 지정 배정'
  };
}
