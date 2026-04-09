/**
 * 허브(Hub)
 * - 사용자가 출발/환승 거점으로 선택하는 주요 지역
 * - name: 화면에 표시되는 사용자 친화적 허브명 (생활권 기준)
 * - districtCode: 공영 물품보관함 API용 지자체코드.
 *                 실제 데이터는 모두 서울특별시(1100000000) 단위로 등록되어 있어
 *                 구 단위 코드로는 조회되지 않음. 근처 보관함은 좌표 기반으로 필터링.
 *                 (https://www.code.go.kr/stdcode/regCodeL.do 참조)
 */
export type THub = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  districtName: string; // 대표 법정동명
  districtCode: string; // 공공데이터 API 조회용 대표 법정동 코드
};

/**
 * 서브 목적지(SubDestination)
 * - 허브에서 최종 도착지까지 연결되는 주요 목적지 후보
 * - distanceM: 허브 기준 도보 이동 거리(데모용 기준값)
 *
 * ※ distanceM은 현재 시연용 추정값이며,
 * 실제 운영 시에는 좌표 기반 거리 계산 또는 지도 API 기반 보정 필요
 */
export type TSubDestination = {
  id: string;
  name: string;
  hubId: string;
  distanceM: number;
  lat: number;
  lng: number;
};

export const HUBS: THub[] = [
  {
    id: "seoul_station",
    name: "서울역",
    lat: 37.555,
    lng: 126.9723,
    districtName: "서울특별시",
    districtCode: "1100000000", // 보관함 API는 시 단위로만 데이터 존재
  },
  {
    id: "gangnam",
    name: "강남역",
    lat: 37.498,
    lng: 127.0276,
    districtName: "서울특별시",
    districtCode: "1100000000", // 보관함 API는 시 단위로만 데이터 존재
  },
  {
    id: "seongsu",
    name: "성수",
    lat: 37.5445,
    lng: 127.0568,
    districtName: "서울특별시",
    districtCode: "1100000000", // 보관함 API는 시 단위로만 데이터 존재
  },
];

export const SUB_DESTINATIONS: TSubDestination[] = [
  // =========================
  // 서울역 허브 기반 목적지
  // =========================
  {
    id: "myeongdong",
    name: "명동",
    hubId: "seoul_station",
    distanceM: 1200,
    lat: 37.5635,
    lng: 126.986,
  },
  {
    id: "namsan",
    name: "남산",
    hubId: "seoul_station",
    distanceM: 2000,
    lat: 37.5512,
    lng: 126.9882,
  },
  {
    id: "yongsan",
    name: "용산",
    hubId: "seoul_station",
    distanceM: 1500,
    lat: 37.5298,
    lng: 126.9648,
  },

  // =========================
  // 강남역 허브 기반 목적지
  // =========================
  {
    id: "yeoksam",
    name: "역삼동",
    hubId: "gangnam",
    distanceM: 800,
    lat: 37.5001,
    lng: 127.0368,
  },
  {
    id: "seocho",
    name: "서초동",
    hubId: "gangnam",
    distanceM: 1000,
    lat: 37.4836,
    lng: 127.0324,
  },
  {
    id: "coex",
    name: "COEX",
    hubId: "gangnam",
    distanceM: 1800,
    lat: 37.5115,
    lng: 127.059,
  },

  // =========================
  // 성수 허브 기반 목적지
  // =========================
  {
    id: "seoulforest",
    name: "서울숲",
    hubId: "seongsu",
    distanceM: 700,
    lat: 37.5443,
    lng: 127.0374,
  },
  {
    id: "cafedistrict",
    name: "성수 카페거리",
    hubId: "seongsu",
    distanceM: 400,
    lat: 37.5447,
    lng: 127.056,
  },
  {
    id: "ttukseom",
    name: "뚝섬 한강공원",
    hubId: "seongsu",
    distanceM: 1200,
    lat: 37.5314,
    lng: 127.0665,
  },
];

/**
 * 허브 ID로 허브 정보 조회
 */
export function findHub(id: string): THub | undefined {
  return HUBS.find((h) => h.id === id);
}

/**
 * 목적지 ID로 서브 목적지 조회
 */
export function findSubDestination(id: string): TSubDestination | undefined {
  return SUB_DESTINATIONS.find((d) => d.id === id);
}

/**
 * 특정 허브에 연결된 목적지 목록 조회
 */
export function getSubDestinations(hubId: string): TSubDestination[] {
  return SUB_DESTINATIONS.filter((d) => d.hubId === hubId);
}
