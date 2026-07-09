# 세찬컴퍼니 인트라넷 V29.37 긴급 회귀 수정

## 기준 버전
- V29.36 설치완료본 기준

## 반영 내용
1. 업데이트 팝업 버전 비교 로직 수정
   - 기존: 단순 문자열 불일치 시 팝업 표시
   - 변경: 숫자 버전 비교로 원격 버전이 현재 버전보다 높을 때만 표시

2. 구버전 version.json 방어
   - 현재 앱이 v29.37인데 원격 version.json이 v29.28처럼 낮게 내려오면 팝업 미표시
   - 캐시 또는 구버전 응답으로 인한 업데이트 팝업 무한 반복 방지

3. 회귀 방지
   - 현재 버전 >= 원격 버전이면 항상 팝업 숨김
   - version.json 최신 변경분은 유지

## QA 결과
- JSX syntax check: PASS
- version compare: PASS
- current v29.37 > remote v29.28: 팝업 미표시 PASS
- current v29.37 = remote v29.37: 팝업 미표시 PASS
- remote v29.38 > current v29.37: 팝업 표시 PASS
- SQL 작업 없음

## 배포 주의
- package-lock.json 업로드 금지
- dist 폴더 업로드 금지
- .npmrc 유지
