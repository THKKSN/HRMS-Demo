"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  History,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { AttendanceMap } from "@/components/map/attendance-map";
import {
  useAttendanceToday,
  useCheckIn,
  useCheckOut,
} from "@/hooks/use-attendance";
import { useMyCompanyLocations } from "@/hooks/use-locations";
import { useGeolocation, gpsErrorMessage } from "@/hooks/use-geolocation";
import { findNearestLocation, findAbsoluteNearest } from "@/lib/geo";
import type { LocationDto } from "@hrms/shared-types";

const STATUS_LABEL: Record<string, string> = {
  Present: "มาทำงาน",
  Late: "มาสาย",
  Absent: "ขาดงาน",
  HalfDay: "ทำงานครึ่งวัน",
};

function formatTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
}

function formatLate(minutes: number): string {
  if (minutes < 60) return `${minutes} นาที`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} ชั่วโมง ${m} นาที` : `${h} ชั่วโมง`;
}

// ── Check-in Modal ────────────────────────────────────────────────────────────

type GpsState =
  | { phase: "idle" }
  | { phase: "gps" }
  | { phase: "error"; message: string }
  | {
      phase: "ready";
      lat: number;
      lng: number;
      matched: { location: LocationDto; distanceMeters: number } | null;
    };

function CheckInModal({
  onClose,
  locations,
  locationsLoading,
}: {
  onClose: () => void;
  locations: LocationDto[];
  locationsLoading: boolean;
}) {
  const { getPosition } = useGeolocation();
  const checkIn = useCheckIn();
  const [gps, setGps] = useState<GpsState>({ phase: "idle" });

  const startGps = useCallback(async () => {
    setGps({ phase: "gps" });
    try {
      const pos = await getPosition();
      const { latitude: lat, longitude: lng } = pos.coords;
      const matched = findNearestLocation(lat, lng, locations);
      setGps({ phase: "ready", lat, lng, matched });
    } catch (err) {
      setGps({
        phase: "error",
        message: gpsErrorMessage(err as GeolocationPositionError),
      });
    }
  }, [getPosition, locations]);

  // auto-start GPS เมื่อ locations โหลดเสร็จ
  useEffect(() => {
    if (!locationsLoading) startGps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationsLoading]);

  async function handleConfirm() {
    if (gps.phase !== "ready" || !gps.matched) return;
    try {
      const result = await checkIn.mutateAsync({
        locationId: gps.matched.location.id,
        latitude: gps.lat,
        longitude: gps.lng,
      });
      toast.success(`เช็คอินสำเร็จ เวลา ${formatTime(result.checkInTime)}`);
      onClose();
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      if (code === "ALREADY_CHECKED_IN") toast.error("เช็คอินแล้ว");
      else toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
      onClose();
    }
  }

  const ready = gps.phase === "ready";
  const inGeofence = ready && !!gps.matched;
  const absoluteNearest =
    ready && !gps.matched
      ? findAbsoluteNearest(gps.lat, gps.lng, locations)
      : null;

  const mapLocation = ready
    ? (gps.matched?.location ??
      absoluteNearest?.location ??
      (locations.length > 0 ? locations[0] : undefined))
    : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl bg-background p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-center">ยืนยันเข้างาน</h2>

        {/* Map */}
        {(locationsLoading || gps.phase === "gps") && (
          <div className="h-40 w-full rounded-xl bg-muted animate-pulse flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {ready && (
          <>
            <AttendanceMap
              userLat={gps.lat}
              userLng={gps.lng}
              locationLat={mapLocation?.latitude}
              locationLng={mapLocation?.longitude}
              radiusMeters={mapLocation?.radiusMeters}
              inGeofence={inGeofence}
            />
            <p className="text-center text-xs text-muted-foreground -mt-2">
              {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}
            </p>
          </>
        )}
        {gps.phase === "error" && (
          <div className="h-40 w-full rounded-xl bg-muted flex items-center justify-center">
            <p className="text-sm text-destructive text-center px-4">
              {gps.message}
            </p>
          </div>
        )}

        {/* Status */}
        {ready && (
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${inGeofence ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
          >
            {inGeofence ? (
              <>
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  <MapPin/> {gps.matched!.location.name} (~
                  {gps.matched!.distanceMeters} ม.)
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  {locations.length === 0
                    ? "ยังไม่มีสถานที่ทำงานในระบบ กรุณาติดต่อ HR"
                    : `อยู่นอกพื้นที่ทำงาน${absoluteNearest ? ` (~${absoluteNearest.distanceMeters} ม. จาก ${absoluteNearest.location.name})` : ""}`}
                </span>
              </>
            )}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-3 text-sm font-medium"
          >
            ยกเลิก
          </button>
          {gps.phase === "error" ? (
            <button
              onClick={startGps}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground"
            >
              ลองใหม่
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={!inGeofence || checkIn.isPending}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {checkIn.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              ยืนยัน
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Check-out Modal ───────────────────────────────────────────────────────────

function CheckOutModal({ onClose }: { onClose: () => void }) {
  const { getPosition } = useGeolocation();
  const checkOut = useCheckOut();
  const [gps, setGps] = useState<GpsState>({ phase: "idle" });

  const startGps = useCallback(async () => {
    setGps({ phase: "gps" });
    try {
      const pos = await getPosition();
      const { latitude: lat, longitude: lng } = pos.coords;
      setGps({ phase: "ready", lat, lng, matched: null });
    } catch (err) {
      setGps({
        phase: "error",
        message: gpsErrorMessage(err as GeolocationPositionError),
      });
    }
  }, [getPosition]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    startGps();
  }, []);

  async function handleConfirm() {
    if (gps.phase !== "ready") return;
    try {
      const result = await checkOut.mutateAsync({
        latitude: gps.lat,
        longitude: gps.lng,
      });
      toast.success(`เช็คเอาต์สำเร็จ เวลา ${formatTime(result.checkOutTime)}`);
      onClose();
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      if (code === "NOT_CHECKED_IN") toast.error("ยังไม่ได้เช็คอิน");
      else toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
      onClose();
    }
  }

  const ready = gps.phase === "ready";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl bg-background p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-center">ยืนยันออกงาน</h2>

        {(gps.phase === "idle" || gps.phase === "gps") && (
          <div className="h-40 w-full rounded-xl bg-muted animate-pulse flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {ready && <AttendanceMap userLat={gps.lat} userLng={gps.lng} />}
        {gps.phase === "error" && (
          <div className="h-40 w-full rounded-xl bg-muted flex items-center justify-center">
            <p className="text-sm text-destructive text-center px-4">
              {gps.message}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-3 text-sm font-medium"
          >
            ยกเลิก
          </button>
          {gps.phase === "error" ? (
            <button
              onClick={startGps}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground"
            >
              ลองใหม่
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={!ready || checkOut.isPending}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {checkOut.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              ยืนยัน
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const router = useRouter();
  const { data: today, isLoading } = useAttendanceToday();
  const { data: locations = [], isLoading: locationsLoading } =
    useMyCompanyLocations();

  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState(false);

  return (
    <>
      <PageHeader title="ลงเวลา" />

      <div className="px-4 py-6 space-y-4">
        {/* สถานะวันนี้ */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-5 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {today?.shiftName ? `${today.shiftName}` : "—"}
                </span>
                <span className="text-sm font-medium">
                  {today?.shiftName
                    ? `${today.shiftStart?.slice(0, 5) ?? ""} – ${today.shiftEnd?.slice(0, 5) ?? ""}`
                    : "—"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">เข้างาน</span>
                <span className="text-sm font-medium">
                  {formatTime(today?.checkInTime)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">ออกงาน</span>
                <span className="text-sm font-medium">
                  {formatTime(today?.checkOutTime)}
                </span>
              </div>

              {today?.status && (
                <div className="pt-1 flex justify-center">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ${
                      today.status === "Present"
                        ? "bg-green-100 text-green-700"
                        : today.status === "Late"
                          ? "bg-yellow-100 text-yellow-700"
                          : today.status === "Absent"
                            ? "bg-red-100 text-red-700" 
                            : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {STATUS_LABEL[today.status]}
                    {today.isLate &&
                      today.lateMinutes > 0 &&
                      ` ${formatLate(today.lateMinutes)}`}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* ปุ่ม Check-in / Check-out */}
        {!isLoading && (
          <div className="space-y-3">
            {today?.canCheckIn && (
              <button
                onClick={() => setShowCheckIn(true)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-green py-4 text-base font-semibold text-green-foreground active:opacity-80"
              >
                <MapPin className="h-5 w-5" />
                เช็คอิน
              </button>
            )}
            {today?.canCheckOut && (
              <button
                onClick={() => setShowCheckOut(true)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-red-500 py-4 text-base font-semibold text-red-500 active:opacity-80"
              >
                <MapPin className="h-5 w-5" />
                เช็คเอาต์
              </button>
            )}
          </div>
        )}

        {/* ปุ่มประวัติ */}
        <button
          onClick={() => router.push("/attendance/history")}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-medium text-muted-foreground active:bg-muted"
        >
          <History className="h-4 w-4" />
          ดูประวัติการลงเวลา
        </button>
      </div>

      {/* Modals */}
      {showCheckIn && (
        <CheckInModal
          onClose={() => setShowCheckIn(false)}
          locations={locations}
          locationsLoading={locationsLoading}
        />
      )}
      {showCheckOut && <CheckOutModal onClose={() => setShowCheckOut(false)} />}
    </>
  );
}
