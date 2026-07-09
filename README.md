# 세찬컴퍼니 인트라넷 V29.36 모바일 UI 품질 안정화 릴리스

## 기준 버전
- V29.35 설치완료 기준

## 반영 내용

### 1. 프리패스 전체 현황
- 모바일 직원 카드 구조는 유지
- 잔여시간 배지 상하 기준 중앙 정렬
- 이번달 사용 시간과 상단 정보 사이 불필요한 여백 축소
- 카드 높이와 정보 밀도 개선

### 2. 프리패스 관리자 조정
- 모바일에서 테이블을 억지로 줄이는 방식 제거
- 직원 선택 목록을 체크 카드형으로 전환
- 체크박스/매장/직원명 사이의 불필요한 좌우 여백 축소
- 적립/차감/사용처리 구분 유지
- 월 사용량 계산은 실제 사용/사용처리만 반영

### 3. 오류보고
- 모바일 목록을 카드형으로 전환
- 오류 유형/작업/보고자/매장/가입번호를 짧고 읽기 쉽게 배치
- 오류 내용은 한 줄 요약으로 표시
- 상세 확인은 공통 모달 기준으로 정리

### 4. 배포 안정성
- package-lock.json 제외
- .npmrc public npm registry 유지
- dist 폴더 제외
- GitHub 업로드 시 불필요한 파일 누적 방지 기준 유지

## QA 체크
- TypeScript JSX Transpile: PASS
- Mobile card density QA: PASS
- Text wrapping QA: PASS
- Horizontal scroll QA: PASS
- Button/Input alignment QA: PASS
- PC table regression: PASS
- SQL 작업 없음

## 배포 주의
- GitHub 업로드 시 package-lock.json은 다시 올리지 마세요.
- .npmrc는 유지하세요.
- dist 폴더는 올리지 마세요.
