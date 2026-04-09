/** Returns distance in meters between two coordinates (Haversine formula) */
export function haversineDistanceM(
  lat1: number,
  lot1: number,
  lat2: number,
  lot2: number
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dlot = ((lot2 - lot1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dlot / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * 직선거리(Haversine)를 실제 도로거리로 보정.
 * 서울 도심 기준 도로거리는 직선거리의 약 1.3배.
 * (정확한 경로 API 연동 전 데모용 추정치)
 */
export const ROAD_FACTOR = 1.3;

export function roadDistanceM(straightM: number): number {
  return Math.round(straightM * ROAD_FACTOR);
}

/** Walking speed ~4 km/h = 67 m/min */
export function walkMinutes(distanceM: number): number {
  return Math.max(1, Math.ceil(distanceM / 67));
}

/** Cycling speed ~12 km/h = 200 m/min */
export function bikeMinutes(distanceM: number): number {
  return Math.max(1, Math.ceil(distanceM / 200));
}

/** HH:mm 시각에 offsetMin 분을 더함 (음수 가능) */
export function offsetTime(base: string, offsetMin: number): string {
  const [h, m] = base.split(":").map(Number);
  const total = (((h * 60 + m + offsetMin) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
    total % 60
  ).padStart(2, "0")}`;
}

/** 현재 시각을 HH:mm 문자열로 반환 */
export function nowHHmm(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;
}

/**
 * from → to 까지 몇 분인지 반환 (자정 경계 처리 포함)
 * 예) diffMinutes('19:00', '19:30') → 30
 *     diffMinutes('23:50', '00:10') → 20
 */
export function diffMinutes(from: string, to: string): number {
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  let diff = th * 60 + tm - (fh * 60 + fm);
  if (diff < -720) diff += 1440;
  if (diff > 720) diff -= 1440;
  return diff;
}
