export type THub = {
  id: string;
  name: string;
  lat: number;
  lot: number;
  lcgvmnInstCd: string; // 자전거 API
  stdgCd: string;       // 보관함 API
};

export type TSubDestination = {
  id: string;
  name: string;
  hubId: string;
  distanceM: number; // 허브에서 도보 거리
  lat: number;
  lot: number;
};

export const HUBS: THub[] = [
  {
    id: 'seoul_station',
    name: '서울역',
    lat: 37.5550,
    lot: 126.9723,
    lcgvmnInstCd: '1100000000',
    stdgCd: '1100000000',
  },
  {
    id: 'gangnam',
    name: '강남역',
    lat: 37.4980,
    lot: 127.0276,
    lcgvmnInstCd: '1100000000',
    stdgCd: '1100000000',
  },
  {
    id: 'seongsu',
    name: '성수',
    lat: 37.5445,
    lot: 127.0568,
    lcgvmnInstCd: '1100000000',
    stdgCd: '1100000000',
  },
];

export const SUB_DESTINATIONS: TSubDestination[] = [
  // 서울역
  { id: 'myeongdong',    name: '명동',         hubId: 'seoul_station', distanceM: 1200, lat: 37.5635, lot: 126.9860 },
  { id: 'namsan',        name: '남산',          hubId: 'seoul_station', distanceM: 2000, lat: 37.5512, lot: 126.9882 },
  { id: 'yongsan',       name: '용산',          hubId: 'seoul_station', distanceM: 1500, lat: 37.5298, lot: 126.9648 },
  // 강남역
  { id: 'yeoksam',       name: '역삼동',        hubId: 'gangnam',       distanceM: 800,  lat: 37.5001, lot: 127.0368 },
  { id: 'seocho',        name: '서초동',        hubId: 'gangnam',       distanceM: 1000, lat: 37.4836, lot: 127.0324 },
  { id: 'coex',          name: 'COEX',          hubId: 'gangnam',       distanceM: 1800, lat: 37.5115, lot: 127.0590 },
  // 성수
  { id: 'seoulforest',   name: '서울숲',        hubId: 'seongsu',       distanceM: 700,  lat: 37.5443, lot: 127.0374 },
  { id: 'cafedistrict',  name: '성수 카페거리', hubId: 'seongsu',       distanceM: 400,  lat: 37.5447, lot: 127.0560 },
  { id: 'ttukseom',      name: '뚝섬 한강공원', hubId: 'seongsu',       distanceM: 1200, lat: 37.5314, lot: 127.0665 },
];

export function findHub(id: string): THub | undefined {
  return HUBS.find((h) => h.id === id);
}

export function findSubDestination(id: string): TSubDestination | undefined {
  return SUB_DESTINATIONS.find((d) => d.id === id);
}

export function getSubDestinations(hubId: string): TSubDestination[] {
  return SUB_DESTINATIONS.filter((d) => d.hubId === hubId);
}
