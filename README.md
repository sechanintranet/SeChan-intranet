# 세찬컴퍼니 인트라넷 V29.38 회귀 복구 릴리스

## 기준 버전
- V29.36 UI/기능 기준

## 반영 내용
1. V29.36에서 정상 확인된 프리패스 모바일/PC UI 기준 유지
2. V29.37 업데이트 팝업 버전 비교 로직만 안전하게 재반영
3. 현재 버전이 원격 version.json보다 같거나 높으면 팝업 미노출
4. package-lock.json 제외 및 .npmrc public registry 유지

## QA 체크
- V29.36 UI 기준 유지: PASS
- 업데이트 팝업 반복 방지: PASS
- 프리패스 점장승인/최종승인 모바일 카드형 유지: PASS
- PC UI 회귀 방지: PASS
- package-lock 제외: PASS
- .npmrc 포함: PASS
- SQL 작업 없음
