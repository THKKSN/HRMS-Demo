"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar, Clock, User, ClipboardList,
  MapPin, ChevronRight, History, TrendingUp,
} from "lucide-react";
import { usePendingApprovals, useLeaveBalance } from "@/hooks/use-leaves";
import { useAttendanceToday } from "@/hooks/use-attendance";
import { useMyHolidays } from "@/hooks/use-holidays";
import { useProfile } from "@/hooks/use-profile";
import { isSupervisorOrAbove } from "@/lib/auth-utils";
import { useAuthStore } from "@/stores/auth.store";

// ── helpers ───────────────────────────────────────────────────────────────────

const DAY_TH = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];
const MONTH_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const MONTH_FULL = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];

function todayThai() {
  const d = new Date();
  return `วัน${DAY_TH[d.getDay()]}ที่ ${d.getDate()} ${MONTH_FULL[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function formatTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("th-TH", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok",
  });
}

function padDate(n: number) { return String(n).padStart(2, "0"); }

// ── Attendance Card ───────────────────────────────────────────────────────────

function AttendanceCard() {
  const router = useRouter();
  const { data: today, isLoading } = useAttendanceToday();

  const hasShift   = !!today?.shiftName;
  const shiftLabel = hasShift
    ? `${today!.shiftName}  ${today!.shiftStart?.slice(0,5) ?? ""} – ${today!.shiftEnd?.slice(0,5) ?? ""}`
    : null;

  const statusColor =
    today?.status === "Present" ? "text-green-600 bg-green-50" :
    today?.status === "Late"    ? "text-yellow-700 bg-yellow-50" :
    today?.status === "Absent"  ? "text-red-600 bg-red-50" :
    "text-muted-foreground bg-muted";

  const statusLabel =
    today?.status === "Present" ? "มาทำงาน" :
    today?.status === "Late"    ? `มาสาย ${today.lateMinutes} นาที` :
    today?.status === "Absent"  ? "ขาดงาน" :
    today?.status === "HalfDay" ? "ครึ่งวัน" : null;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* header row */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">การลงเวลาวันนี้</span>
        </div>
        {statusLabel && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor}`}>
            {statusLabel}
          </span>
        )}
      </div>

      {/* times */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 px-4 py-3">
          {[0,1].map(i => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 px-4 pb-3">
          <div className="rounded-xl bg-muted/50 px-3 py-2.5 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">เข้างาน</p>
            <p className="text-base font-bold tabular-nums">{formatTime(today?.checkInTime)}</p>
          </div>
          <div className="rounded-xl bg-muted/50 px-3 py-2.5 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">ออกงาน</p>
            <p className="text-base font-bold tabular-nums">{formatTime(today?.checkOutTime)}</p>
          </div>
        </div>
      )}

      {/* shift + action */}
      {!isLoading && (today?.canCheckIn || today?.canCheckOut) && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">{shiftLabel ?? "ไม่มีกะงาน"}</p>
          <button
            onClick={() => router.push("/attendance")}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            <MapPin className="h-3.5 w-3.5" />
            {today?.canCheckIn ? "เช็คอิน" : "เช็คเอาต์"}
          </button>
        </div>
      )}
      {!isLoading && !today?.canCheckIn && !today?.canCheckOut && shiftLabel && (
        <div className="border-t border-border px-4 py-2.5">
          <p className="text-xs text-muted-foreground">{shiftLabel}</p>
        </div>
      )}
    </div>
  );
}

// ── Leave Balance Card ────────────────────────────────────────────────────────

function LeaveBalanceCard() {
  const year = new Date().getFullYear();
  const { data: balances, isLoading } = useLeaveBalance(year);

  const top = (balances ?? [])
    .filter(b => b.totalDays > 0)
    .sort((a, b) => b.remainingDays - a.remainingDays)
    .slice(0, 3);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">วันลาคงเหลือ</span>
        </div>
        <Link href="/leaves/balance" className="text-xs text-primary flex items-center gap-0.5">
          ดูทั้งหมด <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="px-4 pb-4 space-y-3">
          {[0,1,2].map(i => <div key={i} className="h-8 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : top.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">ยังไม่มีข้อมูลวันลา</p>
      ) : (
        <div className="px-4 pb-4 space-y-2.5">
          {top.map(b => {
            const pct = b.totalDays > 0 ? (b.usedDays / b.totalDays) * 100 : 0;
            return (
              <div key={b.leaveTypeId}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-muted-foreground truncate max-w-[60%]">{b.leaveTypeName}</span>
                  <span className="text-xs font-semibold">
                    {b.remainingDays}
                    <span className="font-normal text-muted-foreground">/{b.totalDays} วัน</span>
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-red-400" : pct >= 50 ? "bg-yellow-400" : "bg-green-400"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Upcoming Holidays ─────────────────────────────────────────────────────────

function UpcomingHolidaysCard() {
  const now = new Date();
  const year = now.getFullYear();
  const todayStr = `${year}-${padDate(now.getMonth() + 1)}-${padDate(now.getDate())}`;
  const { data: holidays = [], isLoading } = useMyHolidays(year);

  const upcoming = holidays
    .filter(h => h.isActive && h.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  if (!isLoading && upcoming.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <Calendar className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">วันหยุดที่กำลังจะมาถึง</span>
      </div>

      {isLoading ? (
        <div className="px-4 pb-4 space-y-2">
          {[0,1].map(i => <div key={i} className="h-10 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {upcoming.map(h => {
            const d = new Date(h.date + "T00:00:00");
            const diffDays = Math.round((d.getTime() - new Date(todayStr).getTime()) / 86400000);
            const dayLabel = diffDays === 0 ? "วันนี้" : diffDays === 1 ? "พรุ่งนี้" : `อีก ${diffDays} วัน`;
            return (
              <div key={h.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center w-8">
                    <span className="text-[10px] text-muted-foreground leading-none">{MONTH_TH[d.getMonth()]}</span>
                    <span className="text-lg font-bold leading-tight">{d.getDate()}</span>
                  </div>
                  <span className="text-sm font-medium">{h.name}</span>
                </div>
                <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${diffDays === 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Pending Approval Card ─────────────────────────────────────────────────────

function PendingApprovalCard() {
  const employee = useAuthStore(s => s.employee);
  const enabled  = !!employee && isSupervisorOrAbove(employee.roles);
  const { data } = usePendingApprovals(enabled ? {} : false);
  if (!enabled) return null;
  const count = data?.totalCount ?? 0;
  return (
    <Link
      href="/leaves/pending"
      className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5"
    >
      <ClipboardList className="h-5 w-5 shrink-0 text-amber-600" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900">รายการรออนุมัติ</p>
        <p className="text-xs text-amber-700">
          {count > 0 ? `${count} รายการรอการดำเนินการ` : "ไม่มีรายการรออนุมัติ"}
        </p>
      </div>
      {count > 0 && (
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
      <ChevronRight className="h-4 w-4 text-amber-500 shrink-0" />
    </Link>
  );
}

// ── Quick Actions ─────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: "ขอลางาน",   icon: Calendar, href: "/leaves/new",          color: "bg-blue-50 text-blue-600" },
  { label: "ลงเวลา",    icon: MapPin,   href: "/attendance",           color: "bg-green-50 text-green-600" },
  { label: "ประวัติ",   icon: History,  href: "/attendance/history",   color: "bg-purple-50 text-purple-600" },
  { label: "โปรไฟล์",  icon: User,     href: "/profile",              color: "bg-orange-50 text-orange-600" },
] as const;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const employee = useAuthStore(s => s.employee);
  const { data: profile } = useProfile();

  const firstName = (profile?.fullName ?? employee?.fullName ?? "คุณ").split(" ")[0];
  const avatar    = profile?.avatarUrl ?? employee?.avatarUrl;

  const infoLine = [profile?.companyName, profile?.departmentName]
    .filter(Boolean).join(" · ");

  return (
    <div className="px-4 pt-5 pb-24 space-y-4">

      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{todayThai()}</p>
          <h1 className="mt-0.5 text-xl font-bold">สวัสดี, {firstName} 👋</h1>
          {infoLine && <p className="mt-0.5 text-xs text-muted-foreground">{infoLine}</p>}
        </div>
        {avatar ? (
          <img src={avatar} alt={firstName} className="h-12 w-12 rounded-full object-cover ring-2 ring-border" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted ring-2 ring-border">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Quick actions */}
      {/* <div className="grid grid-cols-4 gap-2">
        {QUICK_ACTIONS.map(({ label, icon: Icon, href, color }) => (
          <Link key={label} href={href} className="flex flex-col items-center gap-1.5 py-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-medium text-center leading-tight">{label}</span>
          </Link>
        ))}
      </div> */}

      {/* Attendance */}
      <AttendanceCard />

      {/* Pending (supervisor/hr) */}
      <PendingApprovalCard />

      {/* Leave balance */}
      <LeaveBalanceCard />

      {/* Upcoming holidays */}
      <UpcomingHolidaysCard />

    </div>
  );
}
