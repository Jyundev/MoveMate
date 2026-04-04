import { Errors } from '@/lib/errors/AppError';
import { RouteInputSchema } from '@/features/route/schemas/route.schema';
import type { TRecommendResult, TRouteOption } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RouteInputSchema.safeParse(body);

    if (!parsed.success) {
      const error = Errors.validation(parsed.error.issues[0]?.message);
      return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
    }

    const input = parsed.data;

    // TODO: 실제 공공 API 연동
    // 현재는 목업 데이터 반환
    const mockRoutes: TRouteOption[] = [
      {
        id: 'A',
        label: 'A',
        totalMinutes: 23,
        walkMinutes: 5,
        arrivalTime: input.arrivalTime,
        stability: 'HIGH',
        reason: '도착 희망 시간 내 도착 가능성이 높고, 도보 이동이 적습니다.',
        bus: { routeNo: '273', arrivalMin: 4, stopName: '정류소명' },
        bike: { stationName: '대여소명', availableCount: 5, distanceM: 200, availability: 'HIGH' },
        locker: input.hasLuggage
          ? { name: '보관함명', availableCount: 3, distanceM: 150, availability: 'HIGH' }
          : undefined,
      },
      {
        id: 'B',
        label: 'B',
        totalMinutes: 31,
        walkMinutes: 12,
        arrivalTime: input.arrivalTime,
        stability: 'MEDIUM',
        reason: '버스 배차 간격이 있지만 안정적인 경로입니다.',
        bus: { routeNo: '472', arrivalMin: 11, stopName: '정류소명' },
      },
    ];

    const result: TRecommendResult = {
      routes: mockRoutes,
      requestedArrivalTime: input.arrivalTime,
    };

    return NextResponse.json({ ok: true, data: result });
  } catch {
    const error = Errors.internal();
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
