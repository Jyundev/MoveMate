import { Errors } from '@/lib/errors/AppError';
import { RouteInputSchema } from '@/features/route/schemas/route.schema';
import { computeRouteRecommendation } from '@/features/route/services/routeRecommendService';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RouteInputSchema.safeParse(body);

    if (!parsed.success) {
      const error = Errors.validation(parsed.error.issues[0]?.message);
      return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
    }

    const { hubId, destinationId, hasLuggage, lockerPreference, preferLessWalking } = parsed.data;

    const result = await computeRouteRecommendation(
      hubId,
      destinationId,
      hasLuggage,
      preferLessWalking,
      lockerPreference,
    );

    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    console.error('[route-recommend] 오류:', err);
    const rawMsg = err instanceof Error ? err.message : '';
    // 사용자에게 노출할 메시지: 기술적 상세 제거
    let message = '경로 추천 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    if (rawMsg.includes('공공API 타임아웃') || rawMsg.includes('Public API')) {
      message = '공공 데이터 조회가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요.';
    } else if (rawMsg.includes('조건에 맞는 이동 전략이 없습니다')) {
      message = rawMsg; // 사용자 입력 문제 → 그대로 노출
    } else if (rawMsg.includes('알 수 없는 장소')) {
      message = '선택한 장소 정보를 찾을 수 없습니다. 다시 선택해주세요.';
    }
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
