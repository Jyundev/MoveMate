import { fetchPublicApi } from '@/lib/publicApi';

const BUS_BASE = 'https://apis.data.go.kr/B551982/rte';

export type TBusRoute = {
  rteId: string;
  rteNo: string;
  rteType?: string;
  stpnt?: string;
  edpnt?: string;
  vhclFstTm?: string;
  vhclLstTm?: string;
};

export type TBusStop = {
  rteId: string;
  bstaId: string;
  bstaNm: string;
  bstaSn?: string;
  bstaLat: string;
  bstaLot: string;
};

export type TBusRealtime = {
  rteId: string;
  rteNo: string;
  vhclNo: string;
  lat: string;
  lot: string;
  oprSpd?: string; // 운행 속도 (km/h)
  oprDrct?: string;
  gthrDt?: string; // 수집 일시
};

export async function getBusRoutes(stdgCd: string): Promise<TBusRoute[]> {
  return fetchPublicApi<TBusRoute>(BUS_BASE, '/mst_info', { stdgCd });
}

export async function getBusStops(stdgCd: string): Promise<TBusStop[]> {
  return fetchPublicApi<TBusStop>(BUS_BASE, '/ps_info', { stdgCd });
}

export async function getBusRealtime(stdgCd: string): Promise<TBusRealtime[]> {
  return fetchPublicApi<TBusRealtime>(BUS_BASE, '/rtm_loc_info', { stdgCd });
}
