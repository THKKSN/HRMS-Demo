'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// fix default marker icon ที่ webpack/Next.js break
const icon = L.icon({
  iconUrl: '/leaflet/marker-icon.png',
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  shadowUrl: '/leaflet/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.setView([lat, lng]) }, [lat, lng, map])
  return null
}

type Props = {
  userLat: number
  userLng: number
  locationLat?: number
  locationLng?: number
  radiusMeters?: number
  inGeofence?: boolean
}

export function AttendanceMapInner({
  userLat, userLng,
  locationLat, locationLng,
  radiusMeters, inGeofence,
}: Props) {
  return (
    <MapContainer
      center={[userLat, userLng]}
      zoom={17}
      className="h-40 w-full rounded-xl z-0"
      scrollWheelZoom={false}
      dragging={false}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <RecenterMap lat={userLat} lng={userLng} />

      {/* geofence circle — แสดงเมื่อมี location */}
      {locationLat !== undefined && locationLng !== undefined && radiusMeters !== undefined && (
        <Circle
          center={[locationLat, locationLng]}
          radius={radiusMeters}
          color={inGeofence ? '#22c55e' : '#ef4444'}
          fillColor={inGeofence ? '#22c55e' : '#ef4444'}
          fillOpacity={0.12}
          weight={2}
        />
      )}

      {/* ตำแหน่งปัจจุบันของผู้ใช้ */}
      <Marker position={[userLat, userLng]} icon={icon} />
    </MapContainer>
  )
}
