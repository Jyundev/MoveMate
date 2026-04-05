import { getBikeAvailability } from '@/features/bike/services/bikeService';
import { getLockerRealtime } from '@/features/locker/services/lockerService';
import { findHub, findSubDestination } from '@/config/demoPlaces';
import {
  bikeMinutes,
  haversineDistanceM,
  nowHHmm,
  offsetTime,
  roadDistanceM,
  walkMinutes,
} from '@/lib/geo';
import type { TAvailability, TRecommendResult, TRouteOption, TTransportMode } from '@/types';

function toAvailability(count: number, mid: number, high: number): TAvailability {
  if (count >= high) return 'HIGH';
  if (count >= mid) return 'MEDIUM';
  return 'LOW';
}

export async function computeRouteRecommendation(
  hubId: string,
  destinationId: string,
  arrivalTimeInput: string | undefined,
  hasLuggage: boolean,
  preferLessWalking: boolean,
): Promise<TRecommendResult> {
  const hub = findHub(hubId);
  const dest = findSubDestination(destinationId);
  if (!hub || !dest) throw new Error('알 수 없는 장소입니다.');

  /**
   * 시간 계산 방향 분기
   * - 목표 도착 시각 입력 O → targetArrivalTime 고정, 경로별 estimatedDepartureTime 역산
   * - 목표 도착 시각 입력 X → estimatedDepartureTime = 지금, 경로별 targetArrivalTime 순산
   */
  const hasTargetTime =
    !!arrivalTimeInput && /^\d{2}:\d{2}$/.test(arrivalTimeInput);
  const targetArrivalTime = hasTargetTime ? arrivalTimeInput! : '';
  const departureBase = hasTargetTime ? '' : nowHHmm();

  // 병렬 데이터 조회
  const [bikeResult, lockerResult] = await Promise.allSettled([
    getBikeAvailability(hub.lcgvmnInstCd),
    getLockerRealtime(hub.stdgCd),
  ]);

  // ── 자전거 ─────────────────────────────────────────────────────
  const bikeData = bikeResult.status === 'fulfilled' ? bikeResult.value : [];

  let nearestBike: { name: string; count: number; straightM: number; roadM: number } | null = null;
  if (bikeData.length > 0) {
    let minDist = Infinity;
    let best = bikeData[0];
    for (const b of bikeData) {
      const d = haversineDistanceM(
        hub.lat, hub.lot,
        parseFloat(b.lat || '0'), parseFloat(b.lot || '0'),
      );
      if (d < minDist) { minDist = d; best = b; }
    }
    if (minDist <= 1000) {
      nearestBike = {
        name: best.rntstnNm ?? '인근 대여소',
        count: parseInt(best.bcyclTpkctNocs || '0', 10),
        straightM: Math.round(minDist),
        roadM: roadDistanceM(minDist), // 직선거리 × 1.3 보정
      };
    }
  }

  const bikeCount = nearestBike?.count ?? 0;
  const bikeAvailability: TAvailability = toAvailability(bikeCount, 3, 10);

  // ── 보관함 ─────────────────────────────────────────────────────
  const lockerData = lockerResult.status === 'fulfilled' ? lockerResult.value : [];
  const totalLockers = lockerData.slice(0, 10).reduce((sum, l) => {
    return (
      sum +
      parseInt(l.usePsbltyLrgszStlckCnt || '0', 10) +
      parseInt(l.usePsbltyMdmszStlckCnt || '0', 10) +
      parseInt(l.usePsbltySmlszStlckCnt || '0', 10)
    );
  }, 0);
  const lockerAvailability: TAvailability = toAvailability(totalLockers, 3, 10);

  // ── 도보 거리 (demoPlaces 하드코딩값 — 추정치) ──────────────────
  const walkDistM = dest.distanceM;
  const walkMin = walkMinutes(walkDistM);

  // ── 점수 계산 ──────────────────────────────────────────────────
  type Candidate = { mode: TTransportMode; score: number };
  const candidates: Candidate[] = [
    {
      mode: 'WALK',
      score:
        (walkDistM < 500 ? 4 : walkDistM < 1000 ? 3 : walkDistM < 1500 ? 2 : 1) +
        (!hasLuggage ? 2 : 0) +
        (!preferLessWalking ? 2 : -1),
    },
    {
      mode: 'BIKE',
      score:
        (bikeCount >= 5 ? 3 : bikeCount >= 1 ? 2 : -5) +
        (nearestBike
          ? nearestBike.roadM <= 400 ? 3 : nearestBike.roadM <= 800 ? 2 : 1
          : -2) +
        (preferLessWalking ? 2 : 0) +
        (hasLuggage ? -3 : 2),
    },
    {
      mode: 'LOCKER_WALK',
      score:
        (hasLuggage ? 4 : -1) +
        (totalLockers >= 5 ? 3 : totalLockers >= 1 ? 2 : -5) +
        (preferLessWalking ? 1 : 0),
    },
  ];
  candidates.sort((a, b) => b.score - a.score);

  // ── 추천 카드 생성 ─────────────────────────────────────────────
  const LABELS: Record<TTransportMode, string> = {
    WALK: '도보 이동',
    BIKE: '자전거 이용',
    LOCKER_WALK: '보관함 후 이동',
  };

  /** 소요 시간으로 targetArrivalTime/estimatedDepartureTime 계산 */
  function resolveTimes(totalMin: number): {
    targetArrivalTime: string;
    estimatedDepartureTime: string;
  } {
    if (hasTargetTime) {
      return {
        targetArrivalTime,
        estimatedDepartureTime: offsetTime(targetArrivalTime, -totalMin),
      };
    }
    return {
      targetArrivalTime: offsetTime(departureBase, totalMin),
      estimatedDepartureTime: departureBase,
    };
  }

  const routes: TRouteOption[] = candidates.map((c, idx) => {
    const id = ['A', 'B', 'C'][idx];

    switch (c.mode) {
      case 'WALK': {
        const times = resolveTimes(walkMin);
        return {
          id,
          label: LABELS.WALK,
          mode: 'WALK',
          totalMinutes: walkMin,
          walkMinutes: walkMin,
          ...times,
          stability: walkDistM < 1500 ? 'HIGH' : 'MEDIUM',
          score: c.score,
          reason: buildReason('WALK', { hasLuggage, preferLessWalking, walkDistM }),
        };
      }

      case 'BIKE': {
        // 대여소까지 도보(보정거리) + 목적지까지 자전거(보정거리)
        const toStationMin = nearestBike ? walkMinutes(nearestBike.roadM) : walkMin;
        const rideMin = nearestBike ? bikeMinutes(walkDistM) : walkMin;
        const totalMin = nearestBike ? toStationMin + rideMin : walkMin;
        const times = resolveTimes(totalMin);
        return {
          id,
          label: LABELS.BIKE,
          mode: 'BIKE',
          totalMinutes: totalMin,
          walkMinutes: toStationMin,
          ...times,
          stability: bikeAvailability,
          score: c.score,
          reason: buildReason('BIKE', { bikeCount, nearestBike }),
          ...(nearestBike && {
            bike: {
              stationName: nearestBike.name,
              availableCount: nearestBike.count,
              distanceM: nearestBike.roadM, // 보정된 도로 거리 노출
              availability: bikeAvailability,
            },
          }),
        };
      }

      case 'LOCKER_WALK':
      default: {
        // 보관함 이용 5분(고정 추정) + 도보 이동
        const LOCKER_USE_MIN = 5; // 추정치
        const totalMin = walkMin + LOCKER_USE_MIN;
        const times = resolveTimes(totalMin);
        return {
          id,
          label: LABELS.LOCKER_WALK,
          mode: 'LOCKER_WALK',
          totalMinutes: totalMin,
          walkMinutes: walkMin,
          ...times,
          stability: lockerAvailability,
          score: c.score,
          reason: buildReason('LOCKER_WALK', { totalLockers, hasLuggage }),
          locker: {
            name: `${hub.name} 인근 보관함`,
            availableCount: totalLockers,
            distanceM: nearestBike?.roadM ?? 300,
            availability: lockerAvailability,
          },
        };
      }
    }
  });

  return {
    routes,
    targetArrivalTime: hasTargetTime ? targetArrivalTime : routes[0].targetArrivalTime,
    hubName: hub.name,
    destinationName: dest.name,
  };
}

function buildReason(
  mode: TTransportMode,
  ctx: {
    hasLuggage?: boolean;
    preferLessWalking?: boolean;
    walkDistM?: number;
    bikeCount?: number;
    nearestBike?: { name: string; count: number; roadM: number } | null;
    totalLockers?: number;
  },
): string {
  switch (mode) {
    case 'WALK': {
      const { walkDistM = 0, hasLuggage, preferLessWalking } = ctx;
      if (walkDistM < 500) return '목적지까지 가까워 바로 걸어가는 것이 가장 빠릅니다.';
      if (!hasLuggage && !preferLessWalking) return '짐이 없고 도보 이동이 무리 없는 거리입니다.';
      return `목적지까지 도보 약 ${walkMinutes(walkDistM)}분 거리입니다.`;
    }
    case 'BIKE': {
      const { bikeCount = 0, nearestBike } = ctx;
      if (!nearestBike || bikeCount === 0) return '자전거 대여소가 인근에 있으나 현재 잔여 자전거를 확인하세요.';
      return `약 ${nearestBike.roadM}m 거리 대여소에 자전거 ${bikeCount}대 이용 가능합니다. 도보보다 빠르게 이동할 수 있습니다.`;
    }
    case 'LOCKER_WALK': {
      const { totalLockers = 0, hasLuggage } = ctx;
      if (!hasLuggage) return '보관함에 짐을 맡기면 더 가볍게 이동할 수 있습니다.';
      if (totalLockers === 0) return '보관함 현황을 확인 중입니다. 도착 전 사전 확인을 권장합니다.';
      return `짐이 있을 경우 인근 보관함(${totalLockers}칸 여유)을 이용하면 이동이 훨씬 편합니다.`;
    }
  }
}
