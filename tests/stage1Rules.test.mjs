import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isActiveEmployeeSession,
  resolveJichukRetiredSellerRule,
  sanitizeStoredEmployee
} from '../src/stage1Rules.js';

const employees = [
  { id: 'seller-active', name: '재직판매자', status: '재직', store_name: '금촌', happycall_assignment_enabled: true },
  { id: 'seller-retired', name: '퇴사판매자', status: '퇴사', store_name: '지축', happycall_assignment_enabled: true },
  { id: 'im-jiha', name: '임지하', status: '재직', store_name: '야당', happycall_assignment_enabled: true }
];

test('지축 판매 담당자가 퇴사자면 임지하에게 지정 배정한다', () => {
  assert.deepEqual(resolveJichukRetiredSellerRule({
    customerStore: '지축점',
    sellerName: '퇴사판매자',
    employees
  }), {
    assigned_store: '야당',
    assigned_employee: '임지하',
    reason: '지축 판매 / 퇴사 판매자 / 임지하 지정 배정'
  });
});

test('지축 판매 담당자가 재직 중이면 기존 배정 규칙을 유지한다', () => {
  assert.equal(resolveJichukRetiredSellerRule({
    customerStore: '지축',
    sellerName: '재직판매자',
    employees
  }), null);
});

test('지축이 아닌 판매건에는 특별 배정 규칙을 적용하지 않는다', () => {
  assert.equal(resolveJichukRetiredSellerRule({
    customerStore: '금촌',
    sellerName: '퇴사판매자',
    employees
  }), null);
});

test('저장된 로그인 정보에서는 비밀번호를 제거하고 재직 상태만 허용한다', () => {
  const safe = sanitizeStoredEmployee({ id: '1', name: '직원', status: '재직', password: '1054' });
  assert.equal(safe.password, undefined);
  assert.equal(isActiveEmployeeSession(safe), true);
  assert.equal(isActiveEmployeeSession({ ...safe, status: '퇴사' }), false);
});
