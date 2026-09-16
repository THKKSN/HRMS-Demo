"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { useFmt } from "@/hooks/use-fmt";
import { useMyCompanyLocations } from "@/hooks/use-locations";
import { useGeolocation, gpsErrorKey, type GpsErrorKey } from "@/hooks/use-geolocation";
import { apiErrorText } from "@/lib/api-message";
import { findNearestLocation, findAbsoluteNearest } from "@/lib/geo";
import type { LocationDto } from "@hrms/shared-types";

const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Bangkok",
};

// ── Check-in Modal ────────────────────────────────────────────────────────────

type GpsState =
  | { phase: "idle" }
  | { phase: "gps" }
  | { phase: "error"; errorKey: GpsErrorKey }
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
  const t = useTranslations("liff.attendance");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const fmt = useFmt();
  const { getPosition } = useGeolocation();
  const checkIn = useCheckIn();
  const [gps, setGps] = useState<GpsState>({ phase: "idle" });

  const startGps = useCallback(async () => {
    setGps({ phase: "gps" });
    try {
      const pos = await getPosition();
      const { latitude: lat, longitude: lng } = pos.coords;
      const matched = findNearestLocation(lat, lng, locations) as {
        location: LocationDto;
        distanceMeters: number;
      } | null;
      setGps({ phase: "ready", lat, lng, matched });
    } catch (err) {
      setGps({ phase: "error", errorKey: gpsErrorKey(err as GeolocationPositionError) });
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
      toast.success(t("checkInSuccess", { time: fmt.formatTime(new Date(result.checkInTime!), TIME_OPTIONS) }));
      onClose();
    } catch (err: unknown) {
      toast.error(apiErrorText(err, tErrors, tCommon("state.error")));
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
        <h2 className="text-base font-semibold text-center">{t("confirmCheckIn")}</h2>

        {/* Map */}
        {(locationsLoading || gps.phase === "gps") && (
          <div className="h-40 w-full rounded-xl bg-whited animate-pulse flex items-center justify-center">
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
          <div className="h-40 w-full rounded-xl bg-whited flex items-center justify-center">
            <p className="text-sm text-destructive text-center px-4">
              {t(`gps.${gps.errorKey}`)}
            </p>
          </div>
        )}

        {/* Status — ชื่อสถานที่เป็นชื่อไทยจาก DB (Location มี nameEn/nameId แล้ว แต่ DTO นี้ยังส่ง name เดียว) */}
        {ready && (
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${inGeofence ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
          >
            {inGeofence ? (
              <>
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  <MapPin/> {gps.matched!.location.name} ({t("distance", { meters: gps.matched!.distanceMeters })})
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  {locations.length === 0
                    ? t("noLocations")
                    : absoluteNearest
                      ? t("outsideGeofenceNearest", { meters: absoluteNearest.distanceMeters, name: absoluteNearest.location.name })
                      : t("outsideGeofence")}
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
            {tCommon("action.cancel")}
          </button>
          {gps.phase === "error" ? (
            <button
              onClick={startGps}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground"
            >
              {tCommon("action.retryShort")}
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
              {tCommon("action.confirm")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Check-out Modal ───────────────────────────────────────────────────────────

function CheckOutModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations("liff.attendance");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const fmt = useFmt();
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
      setGps({ phase: "error", errorKey: gpsErrorKey(err as GeolocationPositionError) });
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
      toast.success(t("checkOutSuccess", { time: fmt.formatTime(new Date(result.checkOutTime!), TIME_OPTIONS) }));
      onClose();
    } catch (err: unknown) {
      toast.error(apiErrorText(err, tErrors, tCommon("state.error")));
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
        <h2 className="text-base font-semibold text-center">{t("confirmCheckOut")}</h2>

        {(gps.phase === "idle" || gps.phase === "gps") && (
          <div className="h-40 w-full rounded-xl bg-whited animate-pulse flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {ready && <AttendanceMap userLat={gps.lat} userLng={gps.lng} />}
        {gps.phase === "error" && (
          <div className="h-40 w-full rounded-xl bg-whited flex items-center justify-center">
            <p className="text-sm text-destructive text-center px-4">
              {t(`gps.${gps.errorKey}`)}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-3 text-sm font-medium"
          >
            {tCommon("action.cancel")}
          </button>
          {gps.phase === "error" ? (
            <button
              onClick={startGps}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground"
            >
              {tCommon("action.retryShort")}
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
              {tCommon("action.confirm")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const t = useTranslations("liff.attendance");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status.attendance");
  const fmt = useFmt();
  const router = useRouter();
  const { data: today, isLoading } = useAttendanceToday();
  const { data: locations = [], isLoading: locationsLoading } =
    useMyCompanyLocations();

  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState(false);

  const formatTime = (iso?: string) => (iso ? fmt.formatTime(new Date(iso), TIME_OPTIONS) : "—");
  const lateText = (minutes: number) => {
    if (minutes < 60) return tCommon("duration.minutes", { count: minutes });
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest > 0
      ? tCommon("duration.hoursMinutes", { hours, minutes: rest })
      : tCommon("duration.hours", { count: hours });
  };

  return (
    <>
      <PageHeader title={t("title")} />

      <div className="px-4 py-6 space-y-4">
        {/* สถานะวันนี้ — shiftName เป็นชื่อไทยจาก DB (Shift มี nameEn/nameId แล้ว แต่ DTO นี้ยังส่ง name เดียว) */}
        <div className="rounded-2xl border border-border bg-white p-4 space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-5 rounded bg-whited animate-pulse" />
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
                <span className="text-sm text-muted-foreground">{t("checkIn")}</span>
                <span className="text-sm font-medium">
                  {formatTime(today?.checkInTime)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("checkOut")}</span>
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
                    {tStatus(today.status)}
                    {today.isLate &&
                      today.lateMinutes > 0 &&
                      ` ${lateText(today.lateMinutes)}`}
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
                {t("checkInAction")}
              </button>
            )}
            {today?.canCheckOut && (
              <button
                onClick={() => setShowCheckOut(true)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-red-500 py-4 text-base font-semibold text-red-500 active:opacity-80"
              >
                <MapPin className="h-5 w-5" />
                {t("checkOutAction")}
              </button>
            )}
          </div>
        )}

        {/* ปุ่มประวัติ */}
        <button
          onClick={() => router.push("/attendance/history")}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-medium text-muted-foreground active:bg-whited"
        >
          <History className="h-4 w-4" />
          {t("viewHistory")}
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
