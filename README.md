# 세찬컴퍼니 인트라넷 V29.35 UI Design System 안정화 릴리스

## 기준 버전
- V29.34 설치완료본 기준

## 반영 내용

1. 세찬컴퍼니 UI Design System v1
- 모바일 카드 패딩, 간격, 배지, 버튼, 입력창 높이 기준 정리
- 불필요한 줄바꿈과 빈 여백을 줄이는 Density QA 기준 반영
- 모바일 화면의 avoidable horizontal scroll 방지 기준 강화

2. 프리패스 전체 현황
- 모바일 카드 구조를 4줄 나열에서 2줄 중심 구조로 개선
- 이름/매장·권한/이번달 사용/잔여시간 배지를 자연스럽게 정렬
- 잔여시간 배지는 우측 유지하되 카드와 동떨어져 보이지 않도록 간격 보정

3. 프리패스 로그
- 모바일 로그 카드의 정보 줄바꿈 축소
- 직원·유형 / 매장·시간·요청일시 / 사유 중심으로 압축 표시
- 긴 상태 배지가 카드 밖으로 밀리는 문제 방지

4. 프리패스 관리자 조정
- 모바일 테이블의 선택/매장/직원 컬럼 폭 축소
- 불필요한 권한 컬럼은 모바일에서 숨김
- 체크박스, 매장명, 직원명 사이 불필요한 좌우 여백 축소

## QA 체크
- Build: PASS
- Mobile card density QA: PASS
- Text wrapping QA: PASS
- Horizontal scroll QA: PASS
- Button/Input alignment QA: PASS
- PC table regression: PASS
- SQL 작업 없음

## 버전
- v29.35-20260708174500


## V29.35 긴급 누적 수정 - 해피콜 저장 안정화
- 카카오톡 인앱브라우저 iOS 환경에서 해피콜 저장 시 TypeError: Load failed가 발생하는 케이스 대응
- Supabase 저장 요청에 일시 네트워크 실패 재시도 로직 적용
- 화면 오류보고 시 카카오톡 인앱브라우저 안내 문구 개선
- SQL 작업 없음
