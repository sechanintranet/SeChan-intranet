# 세찬 해피콜 관리시스템 V8.2

## V8.2 배포/빌드 안정화
- V8.1 기능 유지
- package.json의 latest 의존성 제거
- React / Vite / Supabase / XLSX 버전 고정
- package-lock.json 재생성
- npm audit/fund 비활성화로 설치 지연 감소
- Vercel Installing dependencies 단계 지연 완화 목적

## 적용 후 확인
1. GitHub에 전체 덮어업로드
2. Vercel Deployments에서 Ready 확인
3. 빌드 시간이 기존 7~8분에서 줄어드는지 확인
4. RAW 업로드 / 해피콜 생성 / 내 해피콜 / 검수 탭 정상 확인
