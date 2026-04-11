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
    const message = err instanceof Error ? err.message : '경로 추천 중 오류가 발생했습니다.';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
