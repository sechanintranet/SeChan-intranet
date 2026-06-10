# 세찬 해피콜 관리시스템 V9.3 FK Safe

## V9.3 긴급 수정
- happycall_targets 삭제 로직 완전 제거
- happycall_logs가 연결된 기존 대상 보존
- 해피콜 생성/DB저장 시 기존 대상은 건드리지 않고 신규 대상만 추가
- FK 오류 방지
- V9.2 메뉴/감사로그/직원별 현황 기능 유지
- package-lock.json 제외 유지

## 핵심 원칙
기존 happycall_targets는 삭제하지 않습니다.
같은 join_no + target_date + call_type 대상이 이미 있으면 건너뜁니다.
