'use client'

export type GpsErrorKey = 'denied' | 'unavailable' | 'timeout' | 'error'

// คืน key ให้หน้าจอแปลเอง (liff.attendance.gps.*) — hook นี้ไม่รู้จักภาษา
export function gpsErrorKey(err: GeolocationPositionError): GpsErrorKey {
  switch (err.code) {
    case 1: return 'denied'
    case 2: return 'unavailable'
    case 3: return 'timeout'
    default: return 'error'
  }
}

export function useGeolocation() {
  const getPosition = (): Promise<GeolocationPosition> =>
    new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10_000,
      }),
    )

  return { getPosition }
}
