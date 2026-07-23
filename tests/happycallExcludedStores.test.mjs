import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');

test('별통신 고객과 별통신 배정 건은 해피콜 생성 및 목록에서 제외한다', () => {
  assert.match(
    source,
    /HAPPY_CALL_EXCLUDED_STORES\s*=\s*new Set\(\[[^\]]*'별통신'[^\]]*\]\)/s
  );
  assert.match(source, /if \(isHappycallExcludedCustomer\(c\)\) return;/);
  assert.match(source, /if \(isHappycallExcludedStore\(a\.assigned_store\)\) return;/);
  assert.match(
    source,
    /return !!target && !target\.is_skipped && !isHappycallExcludedStore\(target\.assigned_store\);/
  );
});
