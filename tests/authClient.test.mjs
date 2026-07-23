import test from 'node:test';
import assert from 'node:assert/strict';
import { beginLegacyPasswordMigration, employeeAuthEmail, signInEmployee } from '../src/authClient.js';

test('직원 인증 이메일은 직원 id로만 결정되어 화면 권한과 섞이지 않는다', () => {
  assert.equal(employeeAuthEmail('00000000-0000-0000-0000-000000000001'), '00000000-0000-0000-0000-000000000001@login.sechan.company');
});

test('기존 비밀번호가 새 보안 조건을 만족하면 강제 변경 없이 전환한다', async () => {
  const supabase = {
    functions: {
      invoke: async () => ({ data: { migrated: true }, error: null })
    }
  };
  const result = await beginLegacyPasswordMigration(supabase, 'employee-id', 'Already!123');
  assert.equal(result.migrated, true);
});

test('모든 직원 로그인은 공통 서버 검사를 거쳐 세션을 저장한다', async () => {
  const calls = [];
  const supabase = {
    functions: {
      invoke: async (name, options) => {
        calls.push({ name, options });
        return {
          data: {
            authenticated: true,
            session: { access_token: 'access-token', refresh_token: 'refresh-token' }
          },
          error: null
        };
      }
    },
    auth: {
      setSession: async (session) => {
        calls.push({ session });
        return { data: { session: { user: { id: 'auth-user' } } }, error: null };
      }
    }
  };

  const result = await signInEmployee(supabase, 'employee-id', 'Password!123');

  assert.equal(result.error, null);
  assert.equal(calls[0].name, 'employee-auth');
  assert.equal(calls[0].options.body.action, 'login');
  assert.deepEqual(calls[1].session, {
    access_token: 'access-token',
    refresh_token: 'refresh-token'
  });
});

test('로그인 잠금 사유는 영어 Edge 오류 대신 서버의 한글 안내를 표시한다', async () => {
  const errorResponse = new Response(JSON.stringify({
    error: '비밀번호를 8회 잘못 입력해 로그인이 3분간 잠겼습니다. 3분 뒤 다시 시도해주세요.'
  }), { status: 429, headers: { 'Content-Type': 'application/json' } });
  const supabase = {
    functions: {
      invoke: async () => ({ data: null, error: { message: 'Edge Function returned a non-2xx status code', context: errorResponse } })
    }
  };

  const result = await signInEmployee(supabase, 'employee-id', 'wrong');
  assert.match(result.error.message, /3분간 잠겼습니다/);
  assert.doesNotMatch(result.error.message, /non-2xx/);
});
