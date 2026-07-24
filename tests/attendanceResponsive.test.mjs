import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/AttendanceModule.jsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

test('洹쇰Т ?대젰? PC ?쒖? 紐⑤컮??移대뱶媛 遺꾨━?쒕떎', () => {
  assert.match(source, /attendanceDesktopTable/);
  assert.match(source, /attendanceMobileList/);
  assert.match(styles, /@media \(max-width: 768px\)[\s\S]*\.attendanceDesktopTable \{ display: none; \}[\s\S]*\.attendanceMobileList \{ display: grid/);
});

test('洹쇰Т ?낅젰移멸낵 移대뱶??醫곸? ?붾㈃?먯꽌???붾㈃ 諛뽰쑝濡??섍?吏 ?딅뒗??, () => {
  assert.match(styles, /\.attendancePage,\s*\.attendancePage \* \{ box-sizing: border-box; \}/);
  assert.match(styles, /\.attendanceForm input,[\s\S]*width: 100%; min-width: 0;/);
  assert.match(styles, /@media \(max-width: 430px\)/);
  assert.match(styles, /@media \(max-width: 340px\)/);
});

test('洹쇰Т 議고쉶??濡쒕뵫 ???곗씠???먮뒗 鍮??곹깭瑜??쒖떆?쒕떎', () => {
  assert.match(source, /if \(loading\) return[\s\S]*<LoadingState/);
  assert.match(source, /<EmptyState>/);
  assert.match(source, /attendanceState/);
});

test('洹쇰Т??諛섏쁺 ?ㅽ뙣??PC? 紐⑤컮??紐⑤몢 ?ㅼ떆 ?쒕룄?????덈떎', () => {
  const buttons = source.match(/retrySheetSync\(record\.id\)/g) || [];
  assert.equal(buttons.length, 4);
  assert.match(styles, /\.attendanceRetry[\s\S]*white-space: nowrap/);
});

