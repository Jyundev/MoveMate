import { haversineDistanceM, roadDistanceM } from "@/lib/geo";
import { fetchPublicApi } from "@/lib/publicApi";

const LOCKER_BASE = "https://apis.data.go.kr/B551982/psl_v2";
const SEOUL_CODE = "1100000000"; // 보관함 데이터는 서울특별시 단위로만 존재

export type TLockerInfo = {
  stlckId?: string;
  stlckRprsPstnNm?: string; // 대표위치명
  stlckDtlPstnNm?: string; // 상세위치명
  lat?: string;
  lot?: string; // 경도 (API 필드명 'lot')
  stlckCnt?: string; // 보관함 수
  sggNm?: string; // 구 이름
  fcltRoadNmAddr?: string; // 도로명주소
};

export type TLockerRealtime = {
  stlckId?: string;
  lclgvNm?: string;
  usePsbltyLrgszStlckCnt?: string; // 대형 가능 수
  usePsbltyMdmszStlckCnt?: string; // 중형 가능 수
  usePsbltySmlszStlckCnt?: string; // 소형 가능 수
  totDt?: string;
};

export type TNearbyLocker = {
  stlckId: string;
  name: string;
  lat: number;
  lot: number;
  straightM: number;
  roadM: number;
  large: number;
  medium: number;
  small: number;
  total: number;
};

export async function getLockerInfo(stdgCd: string): Promise<TLockerInfo[]> {
  return fetchPublicApi<TLockerInfo>(LOCKER_BASE, "/locker_info_v2", {
    stdgCd,
    _numOfRows: "500",
  });
}

export async function getLockerRealtime(
  stdgCd: string
): Promise<TLockerRealtime[]> {
  return fetchPublicApi<TLockerRealtime>(
    LOCKER_BASE,
    "/locker_realtime_use_v2",
    { stdgCd, _numOfRows: "500" }
  );
}

export type TRawLocker = {
  stlckId: string;
  name: string;
  lat: number;
  lot: number;
  large: number;
  medium: number;
  small: number;
  total: number;
};

/**
 * 서울 전체 보관함 원본 데이터를 한 번만 가져와 반환.
 * info + realtime을 병렬 조회한 후 stlckId 기준으로 조인.
 */
export async function getAllLockerData(): Promise<TRawLocker[]> {
  const [infoList, realtimeList] = await Promise.all([
    getLockerInfo(SEOUL_CODE),
    getLockerRealtime(SEOUL_CODE),
  ]);

  const realtimeMap = new Map(
    realtimeList.filter((r) => r.stlckId).map((r) => [r.stlckId!, r])
  );

  const result: TRawLocker[] = [];
  for (const info of infoList) {
    if (!info.stlckId || !info.lat || !info.lot) continue;
    const lat = parseFloat(info.lat);
    const lot = parseFloat(info.lot);
    if (isNaN(lat) || isNaN(lot)) continue;

    const rt = realtimeMap.get(info.stlckId);
    const large = parseInt(rt?.usePsbltyLrgszStlckCnt ?? "0", 10);
    const medium = parseInt(rt?.usePsbltyMdmszStlckCnt ?? "0", 10);
    const small = parseInt(rt?.usePsbltySmlszStlckCnt ?? "0", 10);

    result.push({
      stlckId: info.stlckId,
      name: info.stlckRprsPstnNm ?? info.sggNm ?? "인근 보관함",
      lat,
      lot,
      large,
      medium,
      small,
      total: large + medium + small,
    });
  }

  return result;
}

/**
 * 미리 가져온 원본 데이터에서 좌표 기준으로 근처 보관함을 필터링. (API 호출 없음)
 */
export function filterNearbyLockers(
  allLockers: TRawLocker[],
  targetLat: number,
  targetLot: number,
  maxDistM = 1500
): { nearby: TNearbyLocker[]; totalAvailable: number } {
  const nearby: TNearbyLocker[] = [];

  for (const locker of allLockers) {
    const straightM = haversineDistanceM(targetLat, targetLot, locker.lat, locker.lot);
    if (straightM > maxDistM) continue;

    nearby.push({
      stlckId: locker.stlckId,
      name: locker.name,
      lat: locker.lat,
      lot: locker.lot,
      straightM: Math.round(straightM),
      roadM: roadDistanceM(straightM),
      large: locker.large,
      medium: locker.medium,
      small: locker.small,
      total: locker.total,
    });
  }

  nearby.sort((a, b) => a.straightM - b.straightM);
  const totalAvailable = nearby.reduce((s, l) => s + l.total, 0);

  return { nearby, totalAvailable };
}

/**
 * @deprecated getAllLockerData + filterNearbyLockers 조합으로 대체.
 * 단독 호출 시에만 사용.
 */
export async function getNearbyLockerAvailability(
  hubLat: number,
  hubLot: number,
  maxDistM = 1500
): Promise<{ nearby: TNearbyLocker[]; totalAvailable: number }> {
  const all = await getAllLockerData();
  return filterNearbyLockers(all, hubLat, hubLot, maxDistM);
}
