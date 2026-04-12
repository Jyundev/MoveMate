export type TLockerPreference = 'hub' | 'destination' | 'recommend';

export type TRouteInput = {
  hubId: string;
  destinationId: string;
  hasLuggage: boolean;
  /** hasLuggage=true일 때만 유효: 짐 보관 위치 선호 */
  lockerPreference?: TLockerPreference;
  preferLessWalking: boolean;
};

export type TAvailability = 'HIGH' | 'MEDIUM' | 'LOW';

/** 이 전략이 실제 이동에서 꼬일 가능성 */
export type TFailRisk = 'LOW' | 'MEDIUM' | 'HIGH';

export type TTransportMode = 'WALK' | 'BIKE' | 'LOCKER_WALK' | 'LOCKER_BIKE';

export type TBikeInfo = {
  stationName: string;
  availableCount: number;
  distanceM: number;
  availability: TAvailability;
};

export type TLockerInfo = {
  name: string;
  availableCount: number;
  distanceM: number;
  availability: TAvailability;
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
  /** 현재 자원(자전거·보관함)이 충분한가 — 지금 가능한지 */
  stability: TAvailability;
  /** 가능하더라도 실제 이동에서 꼬일 가능성 — 실패할 수 있는지 */
  failRisk: TFailRisk;
  /** LOCKER_WALK 전용: 보관함 위치 (허브 근처 vs 목적지 근처) */
  lockerLocation?: 'hub' | 'destination';
  reason: string;
  score: number;
  bike?: TBikeInfo;
  locker?: TLockerInfo;
};

export type TDataStatus = {
  bikeApiOk: boolean;
  lockerApiOk: boolean;
};

export type TRecommendResult = {
  routes: TRouteOption[];
  /** 사용자가 설정한 목표 도착 시각 (미설정 시 1순위 경로 기준 예상 도착 시각) */
  targetArrivalTime: string;
  hubName: string;
  destinationName: string;
  dataStatus: TDataStatus;
};
