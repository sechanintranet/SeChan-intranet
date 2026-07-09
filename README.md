# 세찬컴퍼니 인트라넷 v29.34-rollback-baseline

## 목적
- V29.35 이후 발생한 배포 오류, UI 롤백, 업데이트 팝업 혼선 문제를 정리하기 위해 마지막 안정 기준이었던 V29.34로 복원한 기준 파일입니다.
- 앞으로 이 파일을 새 기준으로 삼아 이후 기능을 하나씩 다시 쌓아 올립니다.

## 기준 버전
- v29.34-rollback-baseline

## 반영 내용
1. V29.34 기능 상태 복원
- 프리패스 신청 가능/불가 시간 계산 기준 유지
- 직원별 퇴근시간 기준 예시 안내 유지
- V29.35 이후 섞였던 UI 변경은 이번 기준 파일에 포함하지 않음

2. 버전 확인 기능 추가
- 인트라넷 상단에 현재 설치된 버전이 작게 표시됩니다.
- ZIP 파일명, README, version.json, 화면 상단 버전이 서로 맞는지 확인할 수 있습니다.

3. 배포 오류 예방
- package-lock.json 제외
- dist 폴더 제외
- .npmrc 포함: public npm registry 사용

## 설치 전 확인
- GitHub에 업로드할 때 package-lock.json은 올리지 않습니다.
- dist 폴더는 올리지 않습니다.
- .npmrc는 반드시 유지합니다.

## SQL
- SQL 작업 없음

## 버전 일치 확인
- ZIP: sechan_intranet_v29.34-rollback-baseline.zip
- README: v29.34-rollback-baseline
- version.json: v29.34-rollback-baseline
- 화면 상단 표시: v29.34-rollback-baseline
