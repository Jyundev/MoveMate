import { fetchPublicApi } from '@/lib/publicApi';

const BIKE_BASE = 'https://apis.data.go.kr/B551982/pbdo_v2';

export type TBikeStation = {
  rntstnId: string;
  rntstnNm: string;
  lat: string;
  lot: string;
  roadNmAddr?: string;
};

export type TBikeAvailability = {
  rntstnId: string;
  rntstnNm: string;
  lat: string;
  lot: string;
  bcyclTpkctNocs: string; // 대여 가능 자전거 수
};

export async function getBikeStations(lcgvmnInstCd: string): Promise<TBikeStation[]> {
  return fetchPublicApi<TBikeStation>(BIKE_BASE, '/inf_101_00010001_v2', { lcgvmnInstCd });
}

export async function getBikeAvailability(lcgvmnInstCd: string): Promise<TBikeAvailability[]> {
  return fetchPublicApi<TBikeAvailability>(BIKE_BASE, '/inf_101_00010002_v2', {
    lcgvmnInstCd,
    _numOfRows: '500',
  });
}
