'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Search, Loader2, X, MapPin } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ResolvedAddress {
  provinceName?: string
  districtName?: string
  subDistrictName?: string
  postcode?: string
  road?: string
}

export interface MapPickerProps {
  lat?: number
  lng?: number
  radius?: number
  onSelect: (lat: number, lng: number) => void
  onAddressResolve?: (addr: ResolvedAddress) => void
  height?: string
}

interface NominatimAddress {
  road?: string
  quarter?: string       // กทม.: แขวง...
  neighbourhood?: string
  suburb?: string        // ชุมชน / ตำบลทั่วไป
  village?: string
  town?: string
  municipality?: string
  city?: string          // กทม. ใช้ city แทน state
  city_district?: string // กทม.: เขต...
  district?: string      // บางครั้ง Nominatim ใส่ district level ตรงนี้
  borough?: string
  county?: string        // ต่างจังหวัด: อำเภอ (แต่ กทม. = จังหวัด ต้อง skip)
  state?: string         // จังหวัด (ต่างจังหวัด)
  postcode?: string
  country_code?: string
  [key: string]: string | undefined
}

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: NominatimAddress
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripThaiPrefix(name: string): string {
  return name
    .replace(/^(จังหวัด|อำเภอ|เขต|แขวง|ตำบล)\s*/u, '')
    .trim()
}

function parseNominatimAddress(addr: NominatimAddress): ResolvedAddress {
  // Province: state (ต่างจังหวัด) หรือ city (กทม. ไม่มี state)
  const provinceName = addr.state
    ? stripThaiPrefix(addr.state)
    : addr.city
    ? stripThaiPrefix(addr.city)
    : undefined

  // กทม. structure (มี quarter = แขวง):
  //   suburb = "เขตพญาไท"   → district
  //   quarter = "แขวงสามเสนใน" → subdistrict
  //
  // ต่างจังหวัด structure (ไม่มี quarter):
  //   city_district / county / district → district
  //   suburb / village → subdistrict
  let rawDistrict: string | undefined
  let rawSub: string | undefined

  if (addr.quarter) {
    // Bangkok structure
    rawDistrict = addr.suburb ?? addr.city_district ?? addr.district
    rawSub = addr.quarter
  } else {
    // Provincial structure
    const provinceRaw = addr.state ?? addr.city ?? ''
    const countyIsProvince = addr.county && addr.county === provinceRaw
    rawDistrict = addr.city_district
      ?? addr.district
      ?? addr.borough
      ?? (!countyIsProvince ? addr.county : undefined)
    rawSub = addr.neighbourhood ?? addr.suburb ?? addr.village
  }

  return {
    provinceName,
    districtName: rawDistrict ? stripThaiPrefix(rawDistrict) : undefined,
    subDistrictName: rawSub ? stripThaiPrefix(rawSub) : undefined,
    postcode: addr.postcode,
    road: addr.road,
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<ResolvedAddress | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=th`,
      { headers: { 'Accept-Language': 'th,en' } },
    )
    if (!res.ok) return null
    const data: NominatimResult = await res.json()
    if (!data.address) return null
    return parseNominatimAddress(data.address)
  } catch {
    return null
  }
}

// ── MapPicker ─────────────────────────────────────────────────────────────────

export function MapPicker({
  lat,
  lng,
  radius = 100,
  onSelect,
  onAddressResolve,
  height = '320px',
}: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const circleRef = useRef<any>(null)
  // ใช้ ref สำหรับ callbacks ทั้งหมด เพื่อให้ Leaflet event listeners เรียกเวอร์ชันล่าสุดเสมอ
  const onSelectRef = useRef(onSelect)
  const onAddressResolveRef = useRef(onAddressResolve)
  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])
  useEffect(() => { onAddressResolveRef.current = onAddressResolve }, [onAddressResolve])

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NominatimResult[]>([])
  const [searching, setSearching] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const DEFAULT_LAT = 13.7563
  const DEFAULT_LNG = 100.5018

  // ── handleCoordSelect — เรียกผ่าน ref เพื่อไม่มี stale closure ────────────

  // handleCoordSelectRef — event listeners ใน initMap จับ ref นี้แทน function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCoordSelectRef = useRef<any>(null)
  handleCoordSelectRef.current = async (newLat: number, newLng: number) => {
    onSelectRef.current(newLat, newLng)
    if (!onAddressResolveRef.current) return
    setResolving(true)
    const addr = await reverseGeocode(newLat, newLng)
    setResolving(false)
    if (addr) onAddressResolveRef.current(addr)
  }

  // ── Init Leaflet (client-side only) ───────────────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined') return

    let cancelled = false

    async function initMap() {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')

      // ตรวจสอบหลัง await เพื่อป้องกัน race condition (StrictMode double-invoke)
      if (cancelled || !containerRef.current || mapRef.current) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((containerRef.current as any)._leaflet_id) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const initLat = lat ?? DEFAULT_LAT
      const initLng = lng ?? DEFAULT_LNG

      const map = L.map(containerRef.current).setView([initLat, initLng], lat ? 15 : 6)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      const marker = L.marker([initLat, initLng], { draggable: true }).addTo(map)
      const circle = L.circle([initLat, initLng], {
        radius,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.12,
        weight: 2,
      }).addTo(map)

      marker.on('dragend', () => {
        const pos = marker.getLatLng()
        circle.setLatLng(pos)
        handleCoordSelectRef.current?.(parseFloat(pos.lat.toFixed(6)), parseFloat(pos.lng.toFixed(6)))
      })

      map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
        const pos = e.latlng
        marker.setLatLng(pos)
        circle.setLatLng(pos)
        handleCoordSelectRef.current?.(parseFloat(pos.lat.toFixed(6)), parseFloat(pos.lng.toFixed(6)))
      })

      mapRef.current = map
      markerRef.current = marker
      circleRef.current = circle
    }

    initMap()

    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
        circleRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Sync lat/lng prop → map ───────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current || lat == null || lng == null) return
    markerRef.current?.setLatLng([lat, lng])
    circleRef.current?.setLatLng([lat, lng])
    mapRef.current.setView([lat, lng], 15)
  }, [lat, lng])

  // ── Sync radius prop → circle ─────────────────────────────────────────────

  useEffect(() => {
    if (!circleRef.current) return
    circleRef.current.setRadius(radius)
  }, [radius])

  // ── Nominatim search ──────────────────────────────────────────────────────

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearch = useCallback((value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) { setResults([]); setShowResults(false); return }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5&addressdetails=1&accept-language=th`,
          { headers: { 'Accept-Language': 'th,en' } },
        )
        const data: NominatimResult[] = await res.json()
        setResults(data)
        setShowResults(true)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 500)
  }, [])

  async function selectResult(r: NominatimResult) {
    const newLat = parseFloat(parseFloat(r.lat).toFixed(6))
    const newLng = parseFloat(parseFloat(r.lon).toFixed(6))
    setQuery(r.display_name)
    setShowResults(false)
    setResults([])

    // ใช้ address จาก search result ถ้ามี ไม่ต้อง reverse อีกรอบ
    if (r.address && onAddressResolveRef.current) {
      onSelectRef.current(newLat, newLng)
      onAddressResolveRef.current(parseNominatimAddress(r.address))
    } else {
      await handleCoordSelectRef.current?.(newLat, newLng)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">
      {/* Search bar */}
      <div className="relative">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          {searching ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            placeholder="ค้นหาชื่อสถานที่..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setResults([]); setShowResults(false) }}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown results */}
        {showResults && results.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-1000 mt-1 rounded-lg border border-border bg-background shadow-lg">
            {results.map((r) => (
              <button
                key={r.place_id}
                type="button"
                onClick={() => selectResult(r)}
                className="w-full px-3 py-2.5 text-left text-sm hover:bg-whited/60 first:rounded-t-lg last:rounded-b-lg border-b border-border last:border-0 line-clamp-2"
              >
                {r.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map container */}
      <div className="relative">
        <div
          ref={containerRef}
          style={{ height }}
          className="w-full rounded-lg border border-border overflow-hidden z-0"
        />
        {/* Resolving overlay */}
        {resolving && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/60 z-10 pointer-events-none">
            <div className="flex items-center gap-2 rounded-lg bg-background border border-border px-3 py-2 shadow text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              กำลังดึงข้อมูลที่อยู่...
            </div>
          </div>
        )}
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3" />
        คลิกบน Map หรือลากหมุดเพื่อตั้งพิกัด — จังหวัด/อำเภอ/ตำบลจะถูกเติมอัตโนมัติ
      </p>
    </div>
  )
}
