import { findHub, findSubDestination } from "@/config/demoPlaces";
import { getBikeAvailability } from "@/features/bike/services/bikeService";
import { getAllLockerData, filterNearbyLockers } from "@/features/locker/services/lockerService";
import {
  bikeMinutes,
  haversineDistanceM,
  nowHHmm,
  offsetTime,
  roadDistanceM,
  walkMinutes,
} from "@/lib/geo";
import type {
  TAvailability,
  TFailRisk,
  TRecommendResult,
  TRouteOption,
  TTransportMode,
} from "@/types";
import {
  type AiReasonContext,
  generateAiReasons,
} from "@/features/route/services/aiReasonService";

function toAvailability(
  count: number,
  mid: number,
  high: number
): TAvailability {
  if (count >= high) return "HIGH";
  if (count >= mid) return "MEDIUM";
  return "LOW";
}

export async function computeRouteRecommendation(
  hubId: string,
  destinationId: string,
  hasLuggage: boolean,
  preferLessWalking: boolean,
  lockerPreference?: 'hub' | 'destination' | 'recommend'
): Promise<TRecommendResult> {
  const hub = findHub(hubId);
  const dest = findSubDestination(destinationId);
  if (!hub || !dest) throw new Error("알 수 없는 장소입니다.");

  const departureBase = nowHHmm();

  // 병렬 데이터 조회 — 보관함 원본은 한 번만 가져오고, 허브/목적지 필터링은 메모리에서 처리
  // 8초 타임아웃: fetch signal 대신 Promise.race로 처리 (next: { revalidate } 충돌 방지)
  const API_TIMEOUT_MS = 8000;
  function withTimeout<T>(p: Promise<T>): Promise<T> {
    return Promise.race([
      p,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("공공API 타임아웃")), API_TIMEOUT_MS)
      ),
    ]);
  }

  const t0 = Date.now();
  const [bikeResult, lockerRawResult] = await Promise.allSettled([
    withTimeout(getBikeAvailability()),
    withTimeout(getAllLockerData()),
  ]);
  console.log(`[공공API] bike=${bikeResult.status} locker=${lockerRawResult.status} (${Date.now() - t0}ms)`);
  if (bikeResult.status === "rejected") console.error("[공공API] bike 오류:", bikeResult.reason);
  if (lockerRawResult.status === "rejected") console.error("[공공API] locker 오류:", lockerRawResult.reason);

  const allLockers = lockerRawResult.status === "fulfilled" ? lockerRawResult.value : [];
  const lockerHubResult = filterNearbyLockers(allLockers, hub.lat, hub.lot);
  const lockerDestResult = filterNearbyLockers(allLockers, dest.lat, dest.lot);
  console.log(`[공공API] nearbyHub=${lockerHubResult.nearby.length} nearbyDest=${lockerDestResult.nearby.length} bikeStations=${bikeResult.status === "fulfilled" ? bikeResult.value.length : 0}`);

  // ── 자전거 ─────────────────────────────────────────────────────
  const bikeData = bikeResult.status === "fulfilled" ? bikeResult.value : [];

  let nearestBike: {
    name: string;
    count: number;
    straightM: number;
    roadM: number;
  } | null = null;
  if (bikeData.length > 0) {
    let minDist = Infinity;
    let best = bikeData[0];
    for (const b of bikeData) {
      const d = haversineDistanceM(
        hub.lat,
        hub.lot,
        parseFloat(b.lat || "0"),
        parseFloat(b.lot || "0")
      );
      if (d < minDist) {
        minDist = d;
        best = b;
      }
    }
    if (minDist <= 1000) {
      nearestBike = {
        name: best.rntstnNm ?? "인근 대여소",
        count: parseInt(best.bcyclTpkctNocs || "0", 10),
        straightM: Math.round(minDist),
        roadM: roadDistanceM(minDist), // 직선거리 × 1.3 보정
      };
    }
  }

  const bikeCount = nearestBike?.count ?? 0;
  const bikeAvailability: TAvailability = toAvailability(bikeCount, 3, 10);

  // ── 보관함 ─────────────────────────────────────────────────────
  const { nearby: nearbyLockersHub, totalAvailable: totalLockersHub } = lockerHubResult;
  const { nearby: nearbyLockersDest, totalAvailable: totalLockersDest } = lockerDestResult;

  const lockerHubAvailability: TAvailability = toAvailability(totalLockersHub, 3, 10);
  const lockerDestAvailability: TAvailability = toAvailability(totalLockersDest, 3, 10);

  // ── 도보 거리 (demoPlaces 하드코딩값 — 추정치) ──────────────────
  const walkDistM = dest.distanceM;
  const walkMin = walkMinutes(walkDistM);

  // ── 점수 계산 ──────────────────────────────────────────────────
  type Candidate = {
    mode: TTransportMode;
    score: number;
    lockerLocation?: "hub" | "destination";
  };
  const candidates: Candidate[] = [
    {
      mode: "WALK",
      score:
        (walkDistM < 500
          ? 4
          : walkDistM < 1000
          ? 3
          : walkDistM < 1500
          ? 2
          : 1) +
        (!hasLuggage ? 2 : 0) +
        (!preferLessWalking ? 2 : -1),
    },
    // 짐 없을 때만 유효 — 짐 있으면 필터에서 제외
    {
      mode: "BIKE",
      score:
        (bikeCount >= 5 ? 3 : bikeCount >= 1 ? 2 : -5) +
        (nearestBike
          ? nearestBike.roadM <= 400
            ? 3
            : nearestBike.roadM <= 800
            ? 2
            : 1
          : -2) +
        (walkDistM >= 1200 ? 2 : walkDistM >= 900 ? 1 : 0) +
        (preferLessWalking ? 2 : 0),
    },
    // 거점 근처 보관 → 도보 이동
    {
      mode: "LOCKER_WALK",
      lockerLocation: "hub",
      score:
        (hasLuggage ? 4 : -1) +
        (totalLockersHub >= 5 ? 3 : totalLockersHub >= 1 ? 2 : -5) +
        (walkDistM >= 1000 && walkDistM < 1500 ? 2 : walkDistM >= 1500 ? -1 : 0) +
        (preferLessWalking ? 1 : 0),
    },
    // 목적지 근처 보관 — 목적지 도착 후 짐 맡기고 탐방
    {
      mode: "LOCKER_WALK",
      lockerLocation: "destination",
      score:
        (hasLuggage ? 3 : -2) +
        (totalLockersDest >= 5 ? 3 : totalLockersDest >= 1 ? 2 : -5) +
        (walkDistM >= 1000 && walkDistM < 1500 ? 1 : 0) +
        (preferLessWalking ? -1 : 0),
    },
    // 거점 근처 보관 → 자전거 이동 (짐 있고 도보 최소화 원할 때 최적)
    {
      mode: "LOCKER_BIKE",
      lockerLocation: "hub",
      score:
        (hasLuggage ? 5 : -10) +
        (bikeCount >= 5 ? 3 : bikeCount >= 1 ? 2 : -5) +
        (nearestBike
          ? nearestBike.roadM <= 400
            ? 3
            : nearestBike.roadM <= 800
            ? 2
            : 1
          : -2) +
        (totalLockersHub >= 5 ? 3 : totalLockersHub >= 1 ? 2 : -5) +
        (walkDistM >= 1200 ? 2 : walkDistM >= 900 ? 1 : 0) +
        (preferLessWalking ? 3 : 0),
    },
  ];
  candidates.sort((a, b) => b.score - a.score);

  // 후보 필터링
  const filteredCandidates = candidates.filter((c) => {
    // 자전거: 대여소 없거나 잔여 0대면 제외
    if ((c.mode === "BIKE" || c.mode === "LOCKER_BIKE") &&
        (!nearestBike || nearestBike.count === 0)) return false;
    // 자전거: 짐 있으면 제외 (캐리어 들고 따릉이 불가)
    if (c.mode === "BIKE" && hasLuggage) return false;
    // 보관 전략: 짐 없으면 전체 제외
    if (c.mode === "LOCKER_WALK" || c.mode === "LOCKER_BIKE") {
      if (!hasLuggage) return false;
    }
    // 보관함: 여석 0칸이면 제외
    if (c.mode === "LOCKER_WALK" || c.mode === "LOCKER_BIKE") {
      const lockerCount = c.lockerLocation === "destination"
        ? totalLockersDest
        : totalLockersHub;
      if (lockerCount === 0) return false;
    }
    // LOCKER 전략: 보관 위치 선호 필터
    if (c.mode === "LOCKER_WALK" || c.mode === "LOCKER_BIKE") {
      if (!lockerPreference || lockerPreference === "recommend") return true;
      return c.lockerLocation === lockerPreference;
    }
    return true;
  });

  // ── 추천 카드 생성 ─────────────────────────────────────────────
  const LABELS: Record<TTransportMode, string> = {
    WALK: "도보 이동",
    BIKE: "자전거 이용",
    LOCKER_WALK: "보관함 후 이동",
    LOCKER_BIKE: "짐 보관 후 자전거 이동",
  };

  function resolveTimes(totalMin: number) {
    return {
      targetArrivalTime: offsetTime(departureBase, totalMin),
      estimatedDepartureTime: departureBase,
    };
  }

  const routes: TRouteOption[] = filteredCandidates.map((c, idx) => {
    const id = ["A", "B", "C", "D"][idx];

    switch (c.mode) {
      case "WALK": {
        const times = resolveTimes(walkMin);
        return {
          id,
          label: LABELS.WALK,
          mode: "WALK",
          totalMinutes: walkMin,
          walkMinutes: walkMin,
          ...times,
          stability: walkDistM < 1500 ? "HIGH" : "MEDIUM",
          failRisk: computeFailRisk({
            mode: "WALK",
            bikeCount,
            lockerCount: totalLockersHub,
            totalMinutes: walkMin,
            walkMin,
            walkDistM,
            hasLuggage,
            preferLessWalking,
          }),
          score: c.score,
          reason: buildReason("WALK", {
            hasLuggage,
            preferLessWalking,
            walkDistM,
          }),
        };
      }

      case "BIKE": {
        const toStationMin = nearestBike
          ? walkMinutes(nearestBike.roadM)
          : walkMin;
        // 자전거 구간 = 대여소~목적지 거리 (허브→목적지 - 허브→대여소 직선거리)
        // 대여소가 목적지 방향에 있다고 가정. 최소 200m 보정.
        const rideDistM = nearestBike
          ? Math.max(200, walkDistM - nearestBike.straightM)
          : walkDistM;
        const rideMin = bikeMinutes(rideDistM);
        const totalMin = nearestBike ? toStationMin + rideMin : walkMin;
        const times = resolveTimes(totalMin);
        return {
          id,
          label: LABELS.BIKE,
          mode: "BIKE",
          totalMinutes: totalMin,
          walkMinutes: toStationMin,
          ...times,
          stability: bikeAvailability,
          failRisk: computeFailRisk({
            mode: "BIKE",
            bikeCount,
            lockerCount: totalLockersHub,
            totalMinutes: totalMin,
            walkMin: toStationMin,
            walkDistM,
            hasLuggage,
            preferLessWalking,
          }),
          score: c.score,
          reason: buildReason("BIKE", { bikeCount, nearestBike, walkDistM }),
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

      case "LOCKER_BIKE": {
        const nearestLocker = nearbyLockersHub[0] ?? null;
        const lockerRoadM = nearestLocker?.roadM ?? 300;
        const toLockerMin = walkMinutes(lockerRoadM);
        const LOCKER_USE_MIN = 5;
        const toStationMin = nearestBike ? walkMinutes(nearestBike.roadM) : 0;
        const rideDistM = nearestBike
          ? Math.max(200, walkDistM - nearestBike.straightM)
          : walkDistM;
        const rideMin = bikeMinutes(rideDistM);
        // 보관함과 대여소가 같은 허브 근처 → max로 중복 도보 방지
        const walkToResources = Math.max(toLockerMin, toStationMin);
        const totalMin = walkToResources + LOCKER_USE_MIN + rideMin;
        const times = resolveTimes(totalMin);
        const stabilityScore = Math.min(bikeCount, totalLockersHub);
        const lockerBikeStability: TAvailability =
          stabilityScore >= 5 ? "HIGH" : stabilityScore >= 1 ? "MEDIUM" : "LOW";
        return {
          id,
          label: LABELS.LOCKER_BIKE,
          mode: "LOCKER_BIKE",
          lockerLocation: "hub",
          totalMinutes: totalMin,
          walkMinutes: walkToResources,
          ...times,
          stability: lockerBikeStability,
          failRisk: computeFailRisk({
            mode: "LOCKER_BIKE",
            bikeCount,
            lockerCount: totalLockersHub,
            totalMinutes: totalMin,
            walkMin: walkToResources,
            walkDistM,
            hasLuggage,
            preferLessWalking,
          }),
          score: c.score,
          reason: buildReason("LOCKER_BIKE", {
            bikeCount,
            nearestBike,
            totalLockers: totalLockersHub,
            hubName: hub.name,
            walkDistM,
          }),
          bike: nearestBike
            ? {
                stationName: nearestBike.name,
                availableCount: nearestBike.count,
                distanceM: nearestBike.roadM,
                availability: bikeAvailability,
              }
            : undefined,
          locker: {
            name: nearestLocker?.name ?? `${hub.name} 인근 보관함`,
            availableCount: totalLockersHub,
            distanceM: nearestLocker?.roadM ?? 300,
            availability: lockerHubAvailability,
          },
        };
      }

      case "LOCKER_WALK":
      default: {
        const isHub = c.lockerLocation === "hub";
        const nearbyLockers = isHub ? nearbyLockersHub : nearbyLockersDest;
        const totalLockers = isHub ? totalLockersHub : totalLockersDest;
        const nearestLocker = nearbyLockers[0] ?? null;
        const lockerAvailability = isHub ? lockerHubAvailability : lockerDestAvailability;
        const lockerAreaName = isHub ? hub.name : dest.name;

        const LOCKER_USE_MIN = 5;
        const lockerRoadM = nearestLocker?.roadM ?? 300; // 보관함까지 도로 거리 (없으면 300m 기본값)
        const toLockerMin = walkMinutes(lockerRoadM);    // 보관함까지 도보 시간
        const totalMin = walkMin + toLockerMin + LOCKER_USE_MIN;
        const times = resolveTimes(totalMin);
        return {
          id,
          label: isHub ? "거점 보관 후 이동" : "목적지 도착 후 보관",
          mode: "LOCKER_WALK",
          lockerLocation: c.lockerLocation,
          totalMinutes: totalMin,
          walkMinutes: walkMin + toLockerMin,
          ...times,
          stability: lockerAvailability,
          failRisk: computeFailRisk({
            mode: "LOCKER_WALK",
            bikeCount,
            lockerCount: totalLockers,
            totalMinutes: totalMin,
            walkMin,
            walkDistM,
            hasLuggage,
            preferLessWalking,
          }),
          score: c.score,
          reason: buildReason("LOCKER_WALK", {
            totalLockers,
            hasLuggage,
            lockerLocation: c.lockerLocation,
            hubName: hub.name,
            destName: dest.name,
          }),
          locker: {
            name: nearestLocker?.name ?? `${lockerAreaName} 인근 보관함`,
            availableCount: totalLockers,
            distanceM: nearestLocker?.roadM ?? 300,
            availability: lockerAvailability,
          },
        };
      }
    }
  });

  // ── AI 설명 강화 ──────────────────────────────────────────────
  // rule-based reason을 fallback으로 유지하면서 Claude API로 자연어 설명 보강
  const aiContexts: AiReasonContext[] = routes.map((r, idx) => ({
    mode: r.mode,
    lockerLocation: r.lockerLocation,
    totalMinutes: r.totalMinutes,
    walkingDistanceM: walkDistM,
    hasLuggage,
    preferLessWalking,
    bikeCount: r.bike?.availableCount,
    bikeStationName: r.bike?.stationName,
    bikeDistanceM: r.bike?.distanceM,
    lockerCount: r.locker?.availableCount,
    lockerName: r.locker?.name,
    lockerDistanceM: r.locker?.distanceM,
    stability: r.stability,
    failRisk: r.failRisk,
    hubName: hub.name,
    destinationName: dest.name,
    rank: idx + 1,
  }));

  const aiReasons = await generateAiReasons(aiContexts);

  const enhancedRoutes = routes.map((r, i) => ({
    ...r,
    reason: aiReasons[i] ?? r.reason,
  }));

  return {
    routes: enhancedRoutes,
    targetArrivalTime: routes[0].targetArrivalTime,
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
}): TFailRisk {
  let score = 0;

  // ── 1. 실시간 자원 부족 위험 (0~35) ──────────────────────────
  if (params.mode === "BIKE") {
    if (params.bikeCount === 0) score += 35;
    else if (params.bikeCount <= 1) score += 25;
    else if (params.bikeCount <= 2) score += 15;
    else if (params.bikeCount <= 4) score += 8;
  } else if (params.mode === "LOCKER_WALK") {
    if (params.lockerCount === 0) score += 35;
    else if (params.lockerCount <= 1) score += 25;
    else if (params.lockerCount <= 3) score += 15;
    else if (params.lockerCount <= 5) score += 8;
  } else if (params.mode === "LOCKER_BIKE") {
    // 자전거 + 보관함 둘 다 필요 → 더 높은 위험 요소 반영
    const bikeRisk = params.bikeCount === 0 ? 35
      : params.bikeCount <= 1 ? 25
      : params.bikeCount <= 2 ? 15
      : params.bikeCount <= 4 ? 8 : 0;
    const lockerRisk = params.lockerCount === 0 ? 35
      : params.lockerCount <= 1 ? 25
      : params.lockerCount <= 3 ? 15
      : params.lockerCount <= 5 ? 8 : 0;
    score += Math.max(bikeRisk, lockerRisk);
  }
  // WALK: 자원 의존 없음 → 0

  // ── 2. 거리/피로 위험 (0~20) ──────────────────────────────────
  if (params.walkMin >= 20) score += 20;
  else if (params.walkMin >= 15) score += 15;
  else if (params.walkMin >= 10) score += 8;
  else if (params.walkMin >= 5) score += 3;

  // ── 4. 사용자 조건 불일치 위험 (0~15) ────────────────────────
  if (
    params.mode === "WALK" &&
    params.preferLessWalking &&
    params.walkDistM > 1000
  ) {
    score += 15;
  } else if (params.mode === "BIKE" && params.hasLuggage) {
    score += 10;
  } else if (params.mode === "LOCKER_WALK" && !params.hasLuggage) {
    score += 8;
  } else if (params.mode === "WALK" && params.hasLuggage) {
    score += 5;
  }

  // ── 5. 전략 복잡도 위험 (0~5) ────────────────────────────────
  if (params.mode === "LOCKER_BIKE") score += 5; // 보관함 + 대여소 + 자전거 → 가장 복잡
  else if (params.mode === "LOCKER_WALK") score += 4;
  else if (params.mode === "BIKE") score += 3;

  if (score >= 60) return "HIGH";
  if (score >= 30) return "MEDIUM";
  return "LOW";
}

function buildReason(
  mode: TTransportMode,
  ctx: {
    hasLuggage?: boolean;
    preferLessWalking?: boolean;
    walkDistM?: number;
    bikeCount?: number;
    nearestBike?: { name: string; count: number; roadM: number; straightM: number } | null;
    totalLockers?: number;
    lockerLocation?: "hub" | "destination";
    hubName?: string;
    destName?: string;
  }
): string {
  switch (mode) {
    case "WALK": {
      const { walkDistM = 0, hasLuggage, preferLessWalking } = ctx;
      if (walkDistM < 500)
        return "목적지까지 가까워 바로 걸어가는 것이 가장 빠릅니다.";
      if (!hasLuggage && !preferLessWalking)
        return "짐이 없고 도보 이동이 무리 없는 거리입니다.";
      return `목적지까지 도보 약 ${walkMinutes(walkDistM)}분 거리입니다.`;
    }
    case "BIKE": {
      const { bikeCount = 0, nearestBike, walkDistM = 0 } = ctx;
      if (!nearestBike || bikeCount === 0)
        return "자전거 대여소가 인근에 있으나 현재 잔여 자전거를 확인하세요.";
      const toStationMin = walkMinutes(nearestBike.roadM);
      const rideDistM = Math.max(200, walkDistM - nearestBike.straightM);
      const bikeTotal = toStationMin + bikeMinutes(rideDistM);
      const walkTotal = walkMinutes(walkDistM);
      const saved = walkTotal - bikeTotal;
      const timePart = saved > 0
        ? `도보 대비 약 ${saved}분 빠릅니다.`
        : "도보와 소요 시간이 비슷합니다.";
      return `약 ${nearestBike.roadM}m 거리 대여소에 자전거 ${bikeCount}대 이용 가능합니다. ${timePart}`;
    }
    case "LOCKER_WALK": {
      const { totalLockers = 0, hasLuggage, lockerLocation, hubName, destName } = ctx;
      const areaName = lockerLocation === "hub" ? hubName : destName;
      if (!hasLuggage)
        return `${areaName} 근처 보관함에 짐을 맡기면 더 가볍게 이동할 수 있습니다.`;
      if (totalLockers === 0)
        return `${areaName} 인근 보관함 현황을 확인 중입니다. 도착 전 사전 확인을 권장합니다.`;
      if (lockerLocation === "hub")
        return `${hubName} 도착 후 바로 짐을 맡기고(${totalLockers}칸 여유) 몸만 이동할 수 있습니다.`;
      return `${destName} 도착 후 인근 보관함(${totalLockers}칸 여유)에 짐을 맡기고 자유롭게 탐방할 수 있습니다.`;
    }
    case "LOCKER_BIKE": {
      const { bikeCount = 0, nearestBike, totalLockers = 0, hubName, walkDistM = 0 } = ctx;
      if (!nearestBike || bikeCount === 0)
        return `${hubName} 근처 보관함에 짐을 맡긴 후 자전거로 이동하는 전략입니다.`;
      const rideDistM = Math.max(200, walkDistM - nearestBike.straightM);
      const bikeTotal = walkMinutes(nearestBike.roadM) + bikeMinutes(rideDistM);
      const walkTotal = walkMinutes(walkDistM);
      const saved = walkTotal - bikeTotal;
      const timePart = saved > 0 ? `도보보다 약 ${saved}분 빠릅니다.` : "도보와 소요 시간이 비슷합니다.";
      return `${hubName} 도착 후 보관함(${totalLockers}칸 여유)에 짐을 맡기고, 자전거 ${bikeCount}대 이용 가능한 대여소에서 가볍게 이동하세요. ${timePart}`;
    }
  }
}
