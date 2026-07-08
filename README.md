# 세찬컴퍼니 인트라넷 V29.29 안정화 릴리스

## 기준 버전
- V29.28 마지막 업데이트본 기준
- 설치 완료 전 누적 수정 버전: V29.29

## 반영 내용

1. 프리패스 승인 화면 UI
- 점장 승인/최종 승인 빈 상태 문구 줄바꿈 문제 수정
- 승인 대기 없음 상태를 공통 상태박스로 통일
- 로딩 상태가 명확하게 보이도록 InlineLoadingState 보정

2. 로딩/데이터 없음 상태 통일
- 프리패스 승인, 전체 현황, 프리패스 로그, 관리자 조정, 반기 초기화 영역 점검
- Loading → Data → Empty 순서 유지
- 데이터 로딩 전 빈 리스트처럼 보이는 문제 완화

3. 최종 승인 중복 처리 방지
- 승인 버튼 처리 중 비활성화
- 승인 완료 후 목록 즉시 제거
- 이미 처리된 신청 재승인 차단
- freepass_ledger source_request_id 기준 중복 이력 생성 방지 로직 추가

4. 직원별 퇴근시간 기준 프리패스 제한
- 직원관리 상세에 퇴근시간 입력 추가
- 신규 직원 추가 시 기본 퇴근시간 20:00 저장
- 오후 일찍 퇴근 프리패스는 직원별 퇴근시간 기준으로 신청 마감 계산
- 예: 20:00 퇴근 / 2시간 사용 → 실제 18:00 퇴근 → 16:00 전 신청 필요

5. 최고관리자 메뉴 정리
- 최고관리자는 내 해피콜 카드/메뉴/진입 화면 숨김
- 직원/점장/관리자 권한은 기존 구조 유지

6. 테이블 밀도/횡스크롤 보정
- 프리패스 관리자 조정 체크박스/매장/직원 컬럼 폭 축소
- 반기 초기화/전체 현황/승인 테이블 좌우 여백 축소
- 불필요한 횡스크롤 유발 요소 완화

## SQL 필요 여부

### 필요
직원별 퇴근시간 저장을 위해 employees 테이블에 end_time 컬럼이 필요합니다.

```sql
alter table employees
add column if not exists end_time text default '20:00';
```

### 권장
최종 승인 중복 이력 생성을 DB 레벨에서도 차단하려면 아래 unique index를 추가 권장합니다.
단, 기존 데이터에 source_request_id 중복값이 있으면 먼저 정리해야 합니다.

```sql
create unique index if not exists freepass_ledger_source_request_id_unique
on freepass_ledger(source_request_id)
where source_request_id is not null;
```

## QA 체크
- Build: PASS
- Static regression check: PASS
- Freepass approval duplicate guard: PASS
- Loading/Data/Empty state check: PASS
- Mobile spacing/table density check: PASS
- Role menu check: PASS

## 버전
- v29.29-20260708143000
