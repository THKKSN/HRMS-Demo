'use client'

export function gpsErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case 1: return 'กรุณาอนุญาตให้แอปเข้าถึง GPS'
    case 2: return 'ไม่สามารถระบุตำแหน่งได้ กรุณาลองใหม่'
    case 3: return 'หมดเวลา กรุณาลองใหม่'
    default: return 'เกิดข้อผิดพลาด GPS'
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
