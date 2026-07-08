// Supabase Edge Function: sunday-happycall-auto
// 매주 일요일 KST 09:00 실행용
// 실제 대상 생성 로직은 프론트 TargetGenerator와 동일 기준으로 맞춰야 하며,
// 이 파일은 배포용 엔트리 예시입니다.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async () => {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = kst.getUTCFullYear();
  const mm = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(kst.getUTCDate()).padStart(2, "0");
  const targetDate = `${yyyy}-${mm}-${dd}`;

  // 실제 운영 배포 시 기존 프론트 생성 로직을 서버 함수로 이전해서 호출.
  // 감사로그 작업자 표기 기준:
  // actor_name: 시스템(일요일 자동생성)
  // action: 해피콜대상자동생성

  return new Response(JSON.stringify({
    ok: true,
    targetDate,
    actor: "시스템(일요일 자동생성)",
    message: "Sunday auto generation endpoint ready"
  }), { headers: { "Content-Type": "application/json" } });
});
