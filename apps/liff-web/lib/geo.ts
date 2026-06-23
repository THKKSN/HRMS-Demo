export function distanceMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6_371_000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

type GeoLocation = {
  id: string
  name: string
  latitude: number
  longitude: number
  radiusMeters: number
}

export function findNearestLocation(
  lat: number,
  lng: number,
  locations: GeoLocation[],
): { location: GeoLocation; distanceMeters: number } | null {
  let nearest: GeoLocation | null = null
  let nearestDist = Infinity

  for (const loc of locations) {
    const d = distanceMeters(lat, lng, loc.latitude, loc.longitude)
    const effectiveRadius = Math.max(loc.radiusMeters, 100)
    if (d <= effectiveRadius && d < nearestDist) {
      nearest = loc
      nearestDist = d
    }
  }

  return nearest ? { location: nearest, distanceMeters: Math.round(nearestDist) } : null
}

export function findAbsoluteNearest(
  lat: number,
  lng: number,
  locations: GeoLocation[],
): { location: GeoLocation; distanceMeters: number } | null {
  let nearest: GeoLocation | null = null
  let nearestDist = Infinity
  for (const loc of locations) {
    const d = distanceMeters(lat, lng, loc.latitude, loc.longitude)
    if (d < nearestDist) { nearest = loc; nearestDist = d }
  }
  return nearest ? { location: nearest, distanceMeters: Math.round(nearestDist) } : null
}
