export type TRouteInput = {
  hubId: string;         // 도착 거점 ID (서울역/강남역/성수)
  destinationId: string; // 최종 목적지 ID
  arrivalTime?: string;  // "HH:mm" (선택)
  hasLuggage: boolean;
  preferLessWalking: boolean;
};

export type TAvailability = 'HIGH' | 'MEDIUM' | 'LOW';

export type TTransportMode = 'WALK' | 'BIKE' | 'LOCKER_WALK';

export type TBikeInfo = {
  stationName: string;
  availableCount: number;
  distanceM: number;
};

export type TLockerInfo = {
  name: string;
  availableCount: number;
  distanceM: number;
};

export type TRouteOption = {
  id: string;
  label: string;
  mode: TTransportMode;
  totalMinutes: number;
  walkMinutes: number;
  /** 사용자가 목표한 도착 시각 (HH:mm) */
  targetArrivalTime: string;
  /** 목표 도착 시각에 맞추기 위해 출발해야 하는 시각 (HH:mm) */
  estimatedDepartureTime: string;
  stability: TAvailability;
  reason: string;
  score: number;
  bike?: TBikeInfo & { availability: TAvailability };
  locker?: TLockerInfo & { availability: TAvailability };
};

export type TRecommendResult = {
  routes: TRouteOption[];
  /** 사용자가 설정한 목표 도착 시각 (미설정 시 1순위 경로 기준 예상 도착 시각) */
  targetArrivalTime: string;
  hubName: string;
  destinationName: string;
};
