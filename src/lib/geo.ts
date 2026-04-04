/** Returns distance in meters between two coordinates (Haversine formula) */
export function haversineDistanceM(
  lat1: number,
  lot1: number,
  lat2: number,
  lot2: number,
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLot = ((lot2 - lot1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLot / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Walking speed ~4 km/h = 67 m/min */
export function walkMinutes(distanceM: number): number {
  return Math.max(1, Math.ceil(distanceM / 67));
}
