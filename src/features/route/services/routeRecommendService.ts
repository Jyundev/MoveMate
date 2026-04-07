import { getBikeAvailability } from '@/features/bike/services/bikeService';
import { getLockerRealtime } from '@/features/locker/services/lockerService';
import { findHub, findSubDestination } from '@/config/demoPlaces';
import {
  bikeMinutes,
  diffMinutes,
  haversineDistanceM,
  nowHHmm,
  offsetTime,
  roadDistanceM,
  walkMinutes,
} from '@/lib/geo';
import type { TAvailability, TFailRisk, TRecommendResult, TRouteOption, TTransportMode } from '@/types';

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

  // failRisk 계산을 위한 공통 파라미터
  const requestNowHHmm = nowHHmm();

  const routes: TRouteOption[] = candidates.map((c, idx) => {
    const id = ['A', 'B', 'C'][idx];

    switch (c.mode) {
      case 'WALK': {
        const times = resolveTimes(walkMin);
        const timeBufferMinutes = hasTargetTime
          ? diffMinutes(requestNowHHmm, targetArrivalTime) - walkMin
          : 999;
        return {
          id,
          label: LABELS.WALK,
          mode: 'WALK',
          totalMinutes: walkMin,
          walkMinutes: walkMin,
          ...times,
          stability: walkDistM < 1500 ? 'HIGH' : 'MEDIUM',
          failRisk: computeFailRisk({
            mode: 'WALK', bikeCount, lockerCount: totalLockers,
            totalMinutes: walkMin, walkMin, walkDistM,
            hasLuggage, preferLessWalking, hasTargetTime, timeBufferMinutes,
          }),
          score: c.score,
          reason: buildReason('WALK', { hasLuggage, preferLessWalking, walkDistM }),
        };
      }

      case 'BIKE': {
        const toStationMin = nearestBike ? walkMinutes(nearestBike.roadM) : walkMin;
        const rideMin = nearestBike ? bikeMinutes(walkDistM) : walkMin;
        const totalMin = nearestBike ? toStationMin + rideMin : walkMin;
        const times = resolveTimes(totalMin);
        const timeBufferMinutes = hasTargetTime
          ? diffMinutes(requestNowHHmm, targetArrivalTime) - totalMin
          : 999;
        return {
          id,
          label: LABELS.BIKE,
          mode: 'BIKE',
          totalMinutes: totalMin,
          walkMinutes: toStationMin,
          ...times,
          stability: bikeAvailability,
          failRisk: computeFailRisk({
            mode: 'BIKE', bikeCount, lockerCount: totalLockers,
            totalMinutes: totalMin, walkMin: toStationMin, walkDistM,
            hasLuggage, preferLessWalking, hasTargetTime, timeBufferMinutes,
          }),
          score: c.score,
          reason: buildReason('BIKE', { bikeCount, nearestBike }),
          ...(nearestBike && {
            bike: {
              stationName: nearestBike.name,
              availableCount: nearestBike.count,
              distanceM: nearestBike.roadM,
              availability: bikeAvailability,
            },
          }),
        };
      }

      case 'LOCKER_WALK':
      default: {
        const LOCKER_USE_MIN = 5;
        const totalMin = walkMin + LOCKER_USE_MIN;
        const times = resolveTimes(totalMin);
        const timeBufferMinutes = hasTargetTime
          ? diffMinutes(requestNowHHmm, targetArrivalTime) - totalMin
          : 999;
        return {
          id,
          label: LABELS.LOCKER_WALK,
          mode: 'LOCKER_WALK',
          totalMinutes: totalMin,
          walkMinutes: walkMin,
          ...times,
          stability: lockerAvailability,
          failRisk: computeFailRisk({
            mode: 'LOCKER_WALK', bikeCount, lockerCount: totalLockers,
            totalMinutes: totalMin, walkMin, walkDistM,
            hasLuggage, preferLessWalking, hasTargetTime, timeBufferMinutes,
          }),
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

/**
 * 실패 위험도 계산 (0~100점 → LOW / MEDIUM / HIGH)
 *
 * 5가지 요소를 가중치 점수로 합산:
 *   1. 실시간 자원 부족 위험  (0~35점)
 *   2. 시간 촉박 위험        (0~25점)
 *   3. 거리/피로 위험        (0~20점)
 *   4. 사용자 조건 불일치    (0~15점)
 *   5. 전략 복잡도           (0~5점)
 *
 *  0~29 → LOW · 30~59 → MEDIUM · 60~ → HIGH
 */
function computeFailRisk(params: {
  mode: TTransportMode;
  bikeCount: number;
  lockerCount: number;
  totalMinutes: number;
  walkMin: number;
  walkDistM: number;
  hasLuggage: boolean;
  preferLessWalking: boolean;
  hasTargetTime: boolean;
  timeBufferMinutes: number;
}): TFailRisk {
  let score = 0;

  // ── 1. 실시간 자원 부족 위험 (0~35) ──────────────────────────
  if (params.mode === 'BIKE') {
    if (params.bikeCount === 0)      score += 35;
    else if (params.bikeCount <= 1)  score += 25;
    else if (params.bikeCount <= 2)  score += 15;
    else if (params.bikeCount <= 4)  score += 8;
    // >= 5 → 0
  } else if (params.mode === 'LOCKER_WALK') {
    if (params.lockerCount === 0)      score += 35;
    else if (params.lockerCount <= 1)  score += 25;
    else if (params.lockerCount <= 3)  score += 15;
    else if (params.lockerCount <= 5)  score += 8;
    // > 5 → 0
  }
  // WALK: 자원 의존 없음 → 0

  // ── 2. 시간 촉박 위험 (0~25) ──────────────────────────────────
  if (params.hasTargetTime) {
    const buf = params.timeBufferMinutes;
    if (buf < 0)       score += 25; // 이미 지각
    else if (buf < 5)  score += 20;
    else if (buf < 10) score += 12;
    else if (buf < 20) score += 5;
    // >= 20 → 0 (여유 있음)
  }

  // ── 3. 거리/피로 위험 (0~20) ──────────────────────────────────
  if (params.walkMin >= 20)      score += 20;
  else if (params.walkMin >= 15) score += 15;
  else if (params.walkMin >= 10) score += 8;
  else if (params.walkMin >= 5)  score += 3;

  // ── 4. 사용자 조건 불일치 위험 (0~15) ────────────────────────
  if (params.mode === 'WALK' && params.preferLessWalking && params.walkDistM > 1000) {
    score += 15;
  } else if (params.mode === 'BIKE' && params.hasLuggage) {
    score += 10;
  } else if (params.mode === 'LOCKER_WALK' && !params.hasLuggage) {
    score += 8;
  } else if (params.mode === 'WALK' && params.hasLuggage) {
    score += 5;
  }

  // ── 5. 전략 복잡도 위험 (0~5) ────────────────────────────────
  if (params.mode === 'LOCKER_WALK') score += 5; // 보관함 찾기 → 보관 → 도보
  else if (params.mode === 'BIKE')   score += 3; // 대여소 찾기 → 대여 → 이동

  if (score >= 60) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
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
