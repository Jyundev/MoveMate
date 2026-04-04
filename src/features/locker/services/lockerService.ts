import { fetchPublicApi } from '@/lib/publicApi';

const LOCKER_BASE = 'https://apis.data.go.kr/B551982/psl_v2';

export type TLockerInfo = {
  reprsLocNm?: string; // 대표위치명
  dtlLocNm?: string;   // 상세위치명
  lat?: string;
  lot?: string;
  lockerCo?: string;   // 보관함 수
  roadNmAddr?: string;
};

export type TLockerRealtime = {
  stlckId?: string;
  lclgvNm?: string;
  usePsbltyLrgszStlckCnt?: string; // 대형 가능 수
  usePsbltyMdmszStlckCnt?: string; // 중형 가능 수
  usePsbltySmlszStlckCnt?: string; // 소형 가능 수
  totDt?: string;
};

export async function getLockerInfo(stdgCd: string): Promise<TLockerInfo[]> {
  return fetchPublicApi<TLockerInfo>(LOCKER_BASE, '/locker_info_v2', { stdgCd });
}

export async function getLockerRealtime(stdgCd: string): Promise<TLockerRealtime[]> {
  return fetchPublicApi<TLockerRealtime>(LOCKER_BASE, '/locker_realtime_use_v2', { stdgCd });
}
