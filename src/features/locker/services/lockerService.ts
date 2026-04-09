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
  lng: number;
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

/**
 * 허브 좌표 기준으로 maxDistM 이내의 보관함을 찾아 실시간 가용 수와 함께 반환.
 * 보관함 API는 서울특별시(1100000000) 단위로만 데이터가 존재하므로
 * 전체를 불러온 뒤 좌표 기반으로 필터링함.
 */
export async function getNearbyLockerAvailability(
  hubLat: number,
  hubLng: number,
  maxDistM = 3000
): Promise<{ nearby: TNearbyLocker[]; totalAvailable: number }> {
  const [infoList, realtimeList] = await Promise.all([
    getLockerInfo(SEOUL_CODE),
    getLockerRealtime(SEOUL_CODE),
  ]);

  const realtimeMap = new Map(
    realtimeList.filter((r) => r.stlckId).map((r) => [r.stlckId!, r])
  );

  const nearby: TNearbyLocker[] = [];
  for (const info of infoList) {
    if (!info.stlckId || !info.lat || !info.lot) continue;
    const lat = parseFloat(info.lat);
    const lng = parseFloat(info.lot);
    if (isNaN(lat) || isNaN(lng)) continue;

    const straightM = haversineDistanceM(hubLat, hubLng, lat, lng);
    if (straightM > maxDistM) continue;

    const rt = realtimeMap.get(info.stlckId);
    const large = parseInt(rt?.usePsbltyLrgszStlckCnt ?? "0", 10);
    const medium = parseInt(rt?.usePsbltyMdmszStlckCnt ?? "0", 10);
    const small = parseInt(rt?.usePsbltySmlszStlckCnt ?? "0", 10);

    console.log("rt ", rt);
    nearby.push({
      stlckId: info.stlckId,
      name: info.stlckRprsPstnNm ?? info.sggNm ?? "인근 보관함",
      lat,
      lng,
      straightM: Math.round(straightM),
      roadM: roadDistanceM(straightM),
      large,
      medium,
      small,
      total: large + medium + small,
    });
  }

  nearby.sort((a, b) => a.straightM - b.straightM);
  const totalAvailable = nearby.reduce((s, l) => s + l.total, 0);

  return { nearby, totalAvailable };
}
