export type TRouteInput = {
  origin: string;
  destination: string;
  arrivalTime: string; // "HH:mm"
  hasLuggage: boolean;
  preferLessWalking: boolean;
};

export type TAvailability = 'HIGH' | 'MEDIUM' | 'LOW';

export type TBusInfo = {
  routeNo: string;
  arrivalMin: number; // 도착까지 남은 분
  stopName: string;
};

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
  label: string; // "A" | "B" | "C"
  totalMinutes: number;
  walkMinutes: number;
  arrivalTime: string; // "HH:mm"
  stability: TAvailability;
  reason: string;
  bus?: TBusInfo;
  bike?: TBikeInfo & { availability: TAvailability };
  locker?: TLockerInfo & { availability: TAvailability };
};

export type TRecommendResult = {
  routes: TRouteOption[];
  requestedArrivalTime: string;
};
