# 세찬 해피콜 관리시스템 V8.5 Verified

## V8.5 빌드 검증본
- V7.2 안정본에서 다시 출발
- V8 배정 로직만 안전하게 재적용
- package-lock.json 제거
- npm install 문제 방지
- rejectedInfo 오류 수정 유지
- RAW 업로드 targets 오류 방지
- assignment_history 갱신 위치 정상화

## 포함 기능
- 기존 배정이력 우선
- 최신 담당자 재직 시 최신 담당자 배정
- 최신 담당자 퇴사 시 과거 재직 담당자 승계
- 폐점 매장 승계
- 매장 재직자 순환 배정
- 검수/반려 기능 유지
