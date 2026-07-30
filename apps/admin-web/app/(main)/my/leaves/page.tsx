"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, Plus, FileText, X } from "lucide-react";
import { LeaveStatusBadge } from "@/components/shared/leave-status-badge";
import { useMyLeaves, useLeaveBalance, useCancelLeave } from "@/hooks/use-leaves";
import { useAuthStore } from "@/stores/auth.store";
import { toast } from "sonner";
import type { LeaveStatus, LeaveRequestListItemDto } from "@hrms/shared-types";

const STATUS_TABS: { label: string; value: LeaveStatus | undefined }[] = [
  { label: "ทั้งหมด", value: undefined },
  { label: "รออนุมัติ", value: "PendingSupervisor" },
  { label: "รอ HR", value: "PendingHr" },
  { label: "อนุมัติแล้ว", value: "Approved" },
  { label: "ถูกปฏิเสธ", value: "Rejected" },
];

const CAN_CANCEL: LeaveStatus[] = ["PendingSupervisor", "PendingHr"];

function CancelInline({ item }: { item: LeaveRequestListItemDto }) {
  const [confirm, setConfirm] = useState(false);
  const { mutateAsync: cancel, isPending } = useCancelLeave();

  async function handleCancel(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await cancel(item.id);
      toast.success("ยกเลิกคำขอลาสำเร็จ");
      setConfirm(false);
    } catch {
      toast.error("ยกเลิกไม่สำเร็จ กรุณาลองใหม่");
    }
  }

  if (!CAN_CANCEL.includes(item.status)) return null;

  if (confirm) {
    return (
      <div
        className="flex items-center gap-1.5 shrink-0"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      >
        <button
          onClick={handleCancel}
          disabled={isPending}
          className="rounded-lg bg-destructive px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60"
        >
          {isPending ? "..." : "ยืนยัน"}
        </button>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirm(false); }}
          className="rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground"
        >
          ไม่
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirm(true); }}
      className="shrink-0 flex items-center gap-1 rounded-lg border border-destructive/40 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors"
    >
      <X className="h-3 w-3" />
      ยกเลิก
    </button>
  );
}

function formatDateTH(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    timeZone: "Asia/Bangkok",
  });
}

export default function MyLeavesPage() {
  const employee = useAuthStore((s) => s.employee);
  const firstName = employee?.fullName?.split(" ")[0] ?? "";

  const [activeStatus, setActiveStatus] = useState<LeaveStatus | undefined>(
    undefined,
  );
  const currentYear = new Date().getFullYear();

  const { data, isLoading } = useMyLeaves({ status: activeStatus });
  const { data: balances } = useLeaveBalance(currentYear);

  return (
    <div className="min-h-full bg-muted/30 p-4 lg:p-12">
      <div className="mx-auto space-y-6">
        {/* ── Hero card ───────────────────────────────────── */}
        <div className="flex justify-between gap-4">
          <h1 className="text-xl font-bold text-foreground">
            การลาของฉัน ปี {currentYear + 543}
          </h1>
          <Link href="/my/leaves/new" className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />
            ยื่นใบลาใหม่
          </Link>
        </div>

        {/* ── Leave balance summary ────────────────────── */}
        {balances && balances.some((b) => b.totalDays > 0) && (
          <div>
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              วันลาคงเหลือ
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {balances
                .filter((b) => b.totalDays > 0)
                .map((b) => (
                  <div
                    key={b.leaveTypeId}
                    className="rounded-xl border border-border bg-background p-3.5 shadow-sm"
                  >
                    <p className="truncate text-xs text-muted-foreground">
                      {b.leaveTypeName}
                    </p>
                    <div className="mt-1.5 flex items-end gap-1">
                      <span className="text-2xl font-bold leading-none text-foreground">
                        {b.remainingDays}
                      </span>
                      <span className="mb-0.5 text-xs text-muted-foreground">
                        / {b.totalDays} วัน
                      </span>
                    </div>
                    {b.pendingDays > 0 && (
                      <p className="mt-1 text-[10px] text-amber-500">
                        รออนุมัติ {b.pendingDays} วัน
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── History section ─────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              ประวัติคำขอลา
            </p>
            {data && (
              <p className="text-xs text-muted-foreground">
                {data.totalCount} รายการ
              </p>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.label}
                onClick={() => setActiveStatus(tab.value)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeStatus === tab.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-background border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* List */}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[72px] animate-pulse rounded-2xl bg-muted"
                />
              ))}
            </div>
          ) : !data?.items.length ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-background py-16 text-center shadow-sm">
              <FileText className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium text-foreground">
                ยังไม่มีประวัติการลา
              </p>
              <Link
                href="/my/leaves/new"
                className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
              >
                ยื่นลาเลย
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {data.items.map((item) => {
                const d = new Date(item.dateFrom);
                return (
                  <Link
                    key={item.id}
                    href={`/my/leaves/${item.id}`}
                    className="flex items-center gap-4 rounded-2xl border border-border bg-background p-4 shadow-sm hover:border-primary transition-colors"
                  >
                    {/* Date bubble */}
                    <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-xl py-2 text-center dark:bg-whte/10">
                      <span className="text-[10px] font-semibold text-red-500 uppercase">
                        {d.toLocaleDateString("en-US", {
                          weekday: "short",
                          timeZone: "Asia/Bangkok",
                        })}
                      </span>
                      <span className="text-xl font-bold leading-tight text-foreground">
                        {d.getDate()}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 border-l border-border pl-4">
                      <p className="font-semibold text-foreground truncate">
                        {item.leaveTypeName}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDateTH(item.dateFrom)}
                        {item.dateFrom !== item.dateTo &&
                          ` – ${formatDateTH(item.dateTo)}`}
                        {" · "}
                        {item.totalDays} วัน
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <LeaveStatusBadge status={item.status} />
                      <CancelInline item={item} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
