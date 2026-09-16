"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Calendar, Clock, User, ClipboardList,
  MapPin, ChevronRight, History, TrendingUp, Briefcase,
  MessageSquareWarning,
  Inbox,
  Wrench,
  ReceiptText,
  FileText,
  PenBox,
} from "lucide-react";
import { usePendingApprovals, useLeaveBalance } from "@/hooks/use-leaves";
import { useTicketPendingCounts } from "@/hooks/use-tickets";
import { useAttendanceToday } from "@/hooks/use-attendance";
import { useMyHolidays } from "@/hooks/use-holidays";
import { useProfile } from "@/hooks/use-profile";
import { useFmt } from "@/hooks/use-fmt";
import { hasPermission } from "@/lib/auth-utils";
import { useAuthStore } from "@/stores/auth.store";

// ── helpers ───────────────────────────────────────────────────────────────────

function padDate(n: number) { return String(n).padStart(2, "0"); }

// ── Attendance Card ───────────────────────────────────────────────────────────

function AttendanceCard() {
  const t = useTranslations("liff.home.attendance");
  const tStatus = useTranslations("status.attendance");
  const fmt = useFmt();
  const router = useRouter();
  const { data: today, isLoading } = useAttendanceToday();

  const formatTime = (iso?: string) =>
    iso ? fmt.formatTime(new Date(iso), { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }) : "—";

  const hasShift   = !!today?.shiftName;
  const shiftLabel = hasShift
    ? `${today!.shiftName}  ${today!.shiftStart?.slice(0,5) ?? ""} – ${today!.shiftEnd?.slice(0,5) ?? ""}`
    : null;

  const statusColor =
    today?.status === "Present" ? "text-green-600 bg-green-50" :
    today?.status === "Late"    ? "text-yellow-700 bg-yellow-50" :
    today?.status === "Absent"  ? "text-red-600 bg-red-50" :
    "text-muted-foreground bg-whited";

  const statusLabel =
    today?.status === "Late" ? t("lateBy", { minutes: today.lateMinutes }) :
    today?.status ? tStatus(today.status) : null;

  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden">
      {/* header row */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{t("title")}</span>
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
          {[0,1].map(i => <div key={i} className="h-12 rounded-xl bg-whited animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 px-4 pb-3">
          <div className="rounded-xl bg-whited/50 px-3 py-2.5 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">{t("checkIn")}</p>
            <p className="text-base font-bold tabular-nums">{formatTime(today?.checkInTime)}</p>
          </div>
          <div className="rounded-xl bg-whited/50 px-3 py-2.5 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">{t("checkOut")}</p>
            <p className="text-base font-bold tabular-nums">{formatTime(today?.checkOutTime)}</p>
          </div>
        </div>
      )}

      {/* shift + action */}
      {!isLoading && (today?.canCheckIn || today?.canCheckOut) && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">{shiftLabel ?? t("noShift")}</p>
          <button
            onClick={() => router.push("/attendance")}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            <MapPin className="h-3.5 w-3.5" />
            {today?.canCheckIn ? t("checkInAction") : t("checkOutAction")}
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
  const t = useTranslations("liff.home.leaveBalance");
  const tCommon = useTranslations("common");
  const year = new Date().getFullYear();
  const { data: balances, isLoading } = useLeaveBalance(year);

  const top = (balances ?? [])
    .filter(b => b.totalDays > 0)
    .sort((a, b) => b.remainingDays - a.remainingDays)
    .slice(0, 3);

  return (
    <div className="rounded-2xl border border-border bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{t("title")}</span>
        </div>
        <Link href="/leaves/balance" className="text-xs text-primary flex items-center gap-0.5">
          {tCommon("action.viewAll")} <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="px-4 pb-4 space-y-3">
          {[0,1,2].map(i => <div key={i} className="h-8 rounded-lg bg-whited animate-pulse" />)}
        </div>
      ) : top.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">{t("empty")}</p>
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
                    <span className="font-normal text-muted-foreground">{t("ofTotal", { total: b.totalDays })}</span>
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-whited overflow-hidden">
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
  const t = useTranslations("liff.home.holidays");
  const fmt = useFmt();
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
    <div className="rounded-2xl border border-border bg-backgrond overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <Calendar className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">{t("title")}</span>
      </div>

      {isLoading ? (
        <div className="px-4 pb-4 space-y-2">
          {[0,1].map(i => <div key={i} className="h-10 rounded-xl bg-whited animate-pulse" />)}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {upcoming.map(h => {
            const d = new Date(h.date + "T00:00:00");
            const diffDays = Math.round((d.getTime() - new Date(todayStr).getTime()) / 86400000);
            const dayLabel = diffDays === 0 ? t("today") : diffDays === 1 ? t("tomorrow") : t("inDays", { count: diffDays });
            return (
              <div key={h.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center w-8">
                    <span className="text-[10px] text-muted-foreground leading-none">{fmt.formatDate(d, { month: "short" })}</span>
                    <span className="text-lg font-bold leading-tight">{d.getDate()}</span>
                  </div>
                  {/* ชื่อวันหยุดเป็นไทยจาก DB — Holiday ไม่รวมใน Phase M (ดูแผนข้อ 9) */}
                  <span className="text-sm font-medium">{h.name}</span>
                </div>
                <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${diffDays === 0 ? "bg-primary/10 text-primary" : "bg-whited text-muted-foreground"}`}>
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
  const t = useTranslations("liff.home.pendingApproval");
  const employee = useAuthStore(s => s.employee);
  const enabled  = hasPermission(employee, 'leave:approve-supervisor', ['Supervisor', 'Hr', 'Admin']);
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
        <p className="text-sm font-semibold text-amber-900">{t("title")}</p>
        <p className="text-xs text-amber-700">
          {count > 0 ? t("count", { count }) : t("empty")}
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

// ── Pending Work Card (งานคงค้างของฉัน) ───────────────────────────────────────

function PendingWorkRow({ href, label, count }: { href: string; label: string; count: number }) {
  return (
    <Link href={href} className="flex items-center justify-between px-4 py-2.5 active:bg-whited/60">
      <span className="text-sm">{label}</span>
      <span className="flex items-center gap-1.5">
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </span>
    </Link>
  );
}

const PENDING_WORK_ROWS = [
  { key: "assignedActive", href: "/tickets/assigned" },
  { key: "assignedWaitingInfo", href: "/tickets/assigned" },
  { key: "claimable", href: "/tickets/assigned" },
  { key: "awaitingMyConfirmation", href: "/tickets/my" },
  { key: "inboxUntriaged", href: "/tickets/inbox" },
  { key: "cancellationPending", href: "/tickets/inbox" },
  { key: "memoAwaitingAck", href: "/memos/inbox" },
  { key: "memoAwaitingApproval", href: "/memos/approvals" },
] as const;

function PendingWorkCard() {
  const t = useTranslations("liff.home.pendingWork");
  const employee = useAuthStore(s => s.employee);
  const { data: counts, isLoading, isError } = useTicketPendingCounts(!!employee);
  if (!employee || isError) return null;

  const rows = counts
    ? PENDING_WORK_ROWS
        .map(row => ({ ...row, count: counts[row.key] ?? 0 }))
        .filter(row => row.count > 0)
    : [];

  // ผู้ใช้ที่ไม่มีสิทธิ์เห็นงานส่วนไหนเลย (ทุก field เป็น null) ไม่ต้องแสดงการ์ด
  const hasAnyScope = counts
    ? Object.values(counts).some(value => value !== null && value !== undefined)
    : false;
  if (!isLoading && (!counts || !hasAnyScope)) return null;

  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <Briefcase className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">{t("title")}</span>
      </div>
      {isLoading ? (
        <div className="px-4 pb-4 space-y-2">
          {[0, 1].map(i => <div key={i} className="h-9 rounded-xl bg-whited animate-pulse" />)}
        </div>
      ) : rows.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="divide-y divide-border">
          {rows.map(row => (
            <PendingWorkRow key={row.key} href={row.href} label={t(row.key)} count={row.count} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Quick Actions ─────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { key: "newLeave",   icon: Calendar, href: "/leaves/new",          color: "bg-blue-50 text-blue-600" },
  { key: "attendance", icon: MapPin,   href: "/attendance",           color: "bg-green-50 text-green-600" },
  { key: "history",    icon: History,  href: "/attendance/history",   color: "bg-purple-50 text-purple-600" },
  { key: "profile",    icon: User,     href: "/profile",              color: "bg-orange-50 text-orange-600" },
] as const;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const t = useTranslations("liff.home");
  const fmt = useFmt();
  const employee = useAuthStore(s => s.employee);
  const { data: profile } = useProfile();

  const firstName = (profile?.fullName ?? employee?.fullName ?? t("defaultName")).split(" ")[0];
  const avatar    = profile?.avatarUrl ?? employee?.avatarUrl;
  // ผูกกับ permission เป็นหลัก — fallback role เดิมเฉพาะ payload เก่าที่ไม่มี permissionCodes
  const canCreateTicket = hasPermission(employee, 'ticket:create', ['Employee', 'Supervisor', 'Hr', 'Admin']);
  const canViewTicketInbox = hasPermission(employee, 'ticket:view-team', ['Admin', 'Hr', 'Supervisor']);
  const canCreateMemo = hasPermission(employee, 'memo:create', ['Employee', 'Supervisor', 'Hr', 'Admin', 'Executive']);
  const canViewMyMemos = hasPermission(employee, 'memo:view-own', ['Employee', 'Supervisor', 'Hr', 'Admin', 'Executive']);

  // companyName/departmentName เป็นชื่อไทยจาก API — รอปรับ DTO ฝั่งผู้บริโภค (ดูแผน Phase 1)
  const infoLine = [profile?.companyName, profile?.departmentName]
    .filter(Boolean).join(" · ");

  // วันที่วันนี้ตาม locale — ปีแยกต่างหากเพื่อไม่ให้ th ติดคำว่า "พ.ศ." (เหมือนของเดิม)
  const now = new Date();
  const todayLabel = `${fmt.formatDate(now, { weekday: "long", day: "numeric", month: "long" })} ${fmt.formatYear(now.getFullYear())}`;

  return (
    <div className="px-4 pt-5 pb-24 space-y-4">

      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{todayLabel}</p>
          <h1 className="mt-0.5 text-xl font-bold">{t("greeting", { name: firstName })}</h1>
          {infoLine && <p className="mt-0.5 text-xs text-muted-foreground">{infoLine}</p>}
        </div>
        {avatar ? (
          <img src={avatar} alt={firstName} className="h-12 w-12 rounded-full object-cover ring-2 ring-border" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-whited ring-2 ring-border">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Quick actions */}
      {/* <div className="grid grid-cols-4 gap-2">
        {QUICK_ACTIONS.map(({ key, icon: Icon, href, color }) => (
          <Link key={key} href={href} className="flex flex-col items-center gap-1.5 py-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-medium text-center leading-tight">{t(`quickActions.${key}`)}</span>
          </Link>
        ))}
      </div> */}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-2">
        {canCreateTicket && <Link href="/tickets/new" className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 active:opacity-80">
          <MessageSquareWarning className="h-5 w-5 shrink-0 text-emerald-700" />
          <span className="text-sm font-semibold text-emerald-900">{t("links.newTicket")}</span>
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-emerald-500" />
        </Link>}
        {canCreateTicket && <Link href="/tickets/my" className="flex items-center gap-3 rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 active:opacity-80">
          <ClipboardList className="h-5 w-5 shrink-0 text-cyan-700" />
          <span className="text-sm font-semibold text-cyan-900">{t("links.myTickets")}</span>
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-cyan-500" />
        </Link>}
        {canCreateMemo && <Link href="/memos/new" className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 active:opacity-80">
          <PenBox className="h-5 w-5 shrink-0 text-indigo-700" />
          <span className="text-sm font-semibold text-indigo-900">{t("links.newMemo")}</span>
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-indigo-500" />
        </Link>}
        {canViewMyMemos && <Link href="/memos/my" className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 active:opacity-80">
          <FileText className="h-5 w-5 shrink-0 text-violet-700" />
          <span className="text-sm font-semibold text-violet-900">{t("links.myMemos")}</span>
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-violet-500" />
        </Link>}
        {/* ช่องทางแจ้งเรื่องภายนอก — ticket จะติดแท็ก "ภายนอก" (ตัวตนผู้แจ้งภายนอกแยกจากบัญชีพนักงาน) */}
        {/* <Link href="/external" className="col-span-2 flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 active:opacity-80">
          <Wrench className="h-5 w-5 shrink-0 text-rose-700" />
          <span className="text-sm font-semibold text-rose-900">{t("links.externalTicket")}</span>
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-rose-500" />
        </Link> */}
        {/* {canCreateTicket && <Link href="/tickets/assigned" className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 active:opacity-80">
          <Wrench className="h-5 w-5 shrink-0 text-violet-700" />
          <span className="text-sm font-semibold text-violet-900">{t("links.assignedTickets")}</span>
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-violet-500" />
        </Link>}
        {canViewTicketInbox && <Link href="/tickets/inbox" className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 active:opacity-80">
          <Inbox className="h-5 w-5 shrink-0 text-sky-700" />
          <span className="text-sm font-semibold text-sky-900">{t("links.ticketInbox")}</span>
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-sky-500" />
        </Link>} */}
        {/* <Link href="/leaves/new" className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 active:opacity-80">
          <Calendar className="h-5 w-5 text-blue-600 shrink-0" />
          <span className="text-sm font-semibold text-blue-800">{t("links.newLeave")}</span>
          <ChevronRight className="ml-auto h-4 w-4 text-blue-400 shrink-0" />
        </Link>
        <Link href="/expenses" className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 active:opacity-80">
          <ReceiptText className="h-5 w-5 text-amber-600 shrink-0" />
          <span className="text-sm font-semibold text-amber-900">{t("links.myExpenses")}</span>
          <ChevronRight className="ml-auto h-4 w-4 text-amber-500 shrink-0" />
        </Link> */}
        {/* <Link href="/ot/new" className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 active:opacity-80">
          <Briefcase className="h-5 w-5 text-orange-600 shrink-0" />
          <span className="text-sm font-semibold text-orange-800">{t("links.newOt")}</span>
          <ChevronRight className="ml-auto h-4 w-4 text-orange-400 shrink-0" />
        </Link> */}
      </div>

      {/* Pending work (ticket/memo) — ปิดไว้: badge บน bottom nav ทำหน้าที่นี้แทนแล้ว */}
      {/* <PendingWorkCard /> */}

      {/* Attendance */}
      {/* <AttendanceCard /> */}

      {/* Pending (supervisor/hr) */}
      {/* <PendingApprovalCard /> */}

      {/* Leave balance */}
      {/* <LeaveBalanceCard />   */}

      {/* Upcoming holidays */}
      <UpcomingHolidaysCard />

    </div>
  );
}
