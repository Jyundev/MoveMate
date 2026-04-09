import { fetchPublicApi } from "@/lib/publicApi";

const BIKE_BASE = "https://apis.data.go.kr/B551982/pbdo_v2";

/** 서울시 자전거 API는 시(市) 단위 코드 고정 사용 */
const SEOUL_BIKE_INST_CD = "1100000000";

export type TBikeStation = {
  rntstnId: string;
  rntstnNm: string;
  lat: string;
  lng: string;
  roadNmAddr?: string;
};

export type TBikeAvailability = {
  rntstnId: string;
  rntstnNm: string;
  lat: string;
  lng: string;
  bcyclTpkctNocs: string; // 대여 가능 자전거 수
};

export async function getBikeStations(): Promise<TBikeStation[]> {
  return fetchPublicApi<TBikeStation>(BIKE_BASE, "/inf_101_00010001_v2", {
    lcgvmnInstCd: SEOUL_BIKE_INST_CD,
  });
}

export async function getBikeAvailability(): Promise<TBikeAvailability[]> {
  return fetchPublicApi<TBikeAvailability>(BIKE_BASE, "/inf_101_00010002_v2", {
    lcgvmnInstCd: SEOUL_BIKE_INST_CD,
    _numOfRows: "500",
  });
}
