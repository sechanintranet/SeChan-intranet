import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
const authClient = readFileSync(new URL('../src/authClient.js', import.meta.url), 'utf8');
const authFunction = readFileSync(new URL('../supabase/functions/employee-auth/index.ts', import.meta.url), 'utf8');
const accountFunction = readFileSync(new URL('../supabase/functions/employee-account/index.ts', import.meta.url), 'utf8');
const passwordHistoryMigration = readFileSync(new URL('../supabase/migrations/20260721183000_v29_61_password_expiry_history.sql', import.meta.url), 'utf8');
const loginLockoutMigration = readFileSync(new URL('../supabase/migrations/20260723050919_v29_63_employee_login_lockout.sql', import.meta.url), 'utf8');
const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('browser identity is based on Supabase Auth, not editable local storage', () => {
  assert.doesNotMatch(main, /happycall_user/);
  assert.match(main, /supabase\.auth\.getSession\(\)/);
  assert.match(main, /supabase\.auth\.onAuthStateChange/);
});

test('employee passwords are not read or written directly by the browser', () => {
  assert.doesNotMatch(main, /from\(['"]employees['"]\)\s*\.select\(['"]\*['"]\)/s);
  assert.doesNotMatch(main, /from\(['"]employees['"]\)[\s\S]{0,100}update\(\{\s*password\s*:/);
  assert.doesNotMatch(main, /\.eq\(['"]password['"]/);
  assert.match(authClient, /action:\s*'login'/);
  assert.match(authClient, /supabase\.auth\.setSession/);
  assert.doesNotMatch(authClient, /supabase\.auth\.updateUser/);
  assert.match(authClient, /action:\s*'change-password'/);
});

test('legacy login transition is one-time and rate limited', () => {
  assert.match(authFunction, /employee_auth_migration_challenges/);
  assert.match(authFunction, /employee_auth_attempts/);
  assert.match(authFunction, /record_employee_login_failure/);
  assert.match(authFunction, /TEMPORARY_LOGIN_LOCK/);
  assert.match(authFunction, /ADMIN_RESET_REQUIRED/);
  assert.match(authFunction, /3분간 잠겼습니다/);
  assert.match(authFunction, /관리자에게 임시 비밀번호 발급을 요청/);
  assert.match(authFunction, /used_at/);
  assert.match(authFunction, /service\.auth\.admin\.createUser/);
  assert.match(authFunction, /if \(passwordPolicy\(password\)\)/);
  assert.match(authFunction, /migrated:\s*true/);
});

test('employee creation and reset require an active admin role', () => {
  assert.match(accountFunction, /function isAdminLike/);
  assert.match(accountFunction, /\.eq\(['"]status['"],\s*['"]재직['"]\)/);
  assert.match(accountFunction, /actor\?\.role\s*===\s*['"]관리자['"]\s*\|\|\s*actor\?\.role\s*===\s*['"]최고관리자['"]/);
  assert.match(accountFunction, /password_change_required:\s*true/);
});

test('temporary password issuance repairs an active employee without a linked auth account', () => {
  assert.match(accountFunction, /if \(!authUserId\)/);
  assert.match(accountFunction, /service\.auth\.admin\.createUser/);
  assert.match(accountFunction, /email:\s*authEmail\(employee\.id\)/);
  assert.match(accountFunction, /auth_user_id:\s*created\.user\.id/);
  assert.match(accountFunction, /employee_legacy_credentials/);
  assert.match(accountFunction, /password_changed_at:\s*null/);
});

test('temporary password errors show the server reason instead of a generic edge error', () => {
  assert.match(authClient, /error\.context\.clone\(\)\.json\(\)/);
  assert.match(authClient, /serverMessage\s*=\s*body\?\.error/);
  assert.match(main, /resetEmployeeTemporaryPassword\(supabase, employee\.id\)/);
});

test('remember login stores only a seven day browser trust marker and never a password', () => {
  assert.match(main, /REMEMBER_LOGIN_MS\s*=\s*7\s*\*\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
  assert.match(main, /auth_user_id:\s*authUserId/);
  assert.match(main, /expires_at:\s*Date\.now\(\)\s*\+\s*REMEMBER_LOGIN_MS/);
  assert.doesNotMatch(main, /REMEMBER_LOGIN_KEY[\s\S]{0,500}password/);
  assert.match(main, /clearLoginPreference\(\);[\s\S]{0,120}supabase\.auth\.signOut/);
  assert.match(main, /setInterval\(\(\)\s*=>\s*syncAuthenticatedEmployee[\s\S]{0,100}30\s*\*\s*1000/);
});

test('첫 8회 실패는 3분 잠금이고 다음 8회 실패는 관리자 초기화가 필요하다', () => {
  assert.match(loginLockoutMigration, /employee_login_lock_state/);
  assert.match(loginLockoutMigration, /v_now \+ interval '3 minutes'/);
  assert.match(loginLockoutMigration, /next_count >= 8/);
  assert.match(loginLockoutMigration, /lock_stage = 2/);
  assert.match(loginLockoutMigration, /admin_reset_required = true/);
  assert.match(loginLockoutMigration, /enable row level security/);
  assert.match(loginLockoutMigration, /revoke all on table public\.employee_login_lock_state from public, anon, authenticated/);
});

test('로그인 성공과 관리자 임시 비밀번호 발급은 잠금 상태를 해제한다', () => {
  assert.match(authFunction, /clearLoginFailures/);
  assert.match(authFunction, /employee_login_lock_state'\)\.delete\(\)\.eq\('employee_id'/);
  assert.match(authFunction, /ban_duration:\s*banDuration/);
  assert.match(authFunction, /'3m'/);
  assert.match(authFunction, /'876000h'/);
  assert.match(accountFunction, /employee_login_lock_state'\)[\s\S]{0,100}\.delete\(\)[\s\S]{0,100}\.eq\('employee_id'/);
  assert.match(accountFunction, /ban_duration:\s*'none'/);
});

test('password changes are server verified and the previous password cannot be reused', () => {
  assert.match(authClient, /action:\s*'change-password'/);
  assert.doesNotMatch(authClient, /supabase\.auth\.updateUser\(\{ password: nextPassword \}\)/);
  assert.match(accountFunction, /wasLastUserPassword/);
  assert.match(accountFunction, /PBKDF2/);
  assert.match(accountFunction, /PASSWORD_HASH_ITERATIONS\s*=\s*210000/);
  assert.match(accountFunction, /직전에 사용한 비밀번호는 다시 사용할 수 없습니다/);
  assert.doesNotMatch(accountFunction, /action === 'mark-password-changed'/);
});

test('password history is inaccessible to browser roles and stores no plaintext password', () => {
  assert.match(passwordHistoryMigration, /enable row level security/);
  assert.match(passwordHistoryMigration, /revoke all on table public\.employee_password_history from public, anon, authenticated/);
  assert.match(passwordHistoryMigration, /password_hash text not null/);
  assert.match(passwordHistoryMigration, /password_salt text not null/);
  assert.doesNotMatch(passwordHistoryMigration, /password_plain|plain_password/);
});

test('deployment sends baseline browser security headers', () => {
  const allHeaders = vercel.headers.flatMap(entry => entry.headers || []);
  const headerMap = new Map(allHeaders.map(header => [header.key.toLowerCase(), header.value]));
  assert.equal(headerMap.get('x-content-type-options'), 'nosniff');
  assert.equal(headerMap.get('x-frame-options'), 'DENY');
  assert.equal(headerMap.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.match(headerMap.get('permissions-policy') || '', /camera=\(self\)/);
});

test('known vulnerable packages are replaced with reviewed versions', () => {
  assert.equal(packageJson.dependencies.vite, '6.4.3');
  assert.equal(packageJson.dependencies['@supabase/supabase-js'], '2.108.0');
  assert.match(packageJson.dependencies.xlsx, /xlsx-0\.20\.3\.tgz$/);
});
