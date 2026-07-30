"use client";

import Link from "next/link";
import { useState } from "react";
import { ClipboardList, Plus, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { LeaveStatusBadge } from "@/components/shared/leave-status-badge";
import { useMyLeaves, useCancelLeave } from "@/hooks/use-leaves";
import type { LeaveStatus, LeaveRequestListItemDto } from "@hrms/shared-types";

const STATUS_TABS: { label: string; value: LeaveStatus | undefined }[] = [
  { label: "ทั้งหมด", value: undefined },
  { label: "รออนุมัติ", value: "PendingSupervisor" },
  { label: "อนุมัติแล้ว", value: "Approved" },
  { label: "ถูกปฏิเสธ", value: "Rejected" },
];

const CAN_CANCEL: LeaveStatus[] = ["PendingSupervisor", "PendingHr"];

function CancelInline({ item }: { item: LeaveRequestListItemDto }) {
  const [confirm, setConfirm] = useState(false);
  const { mutateAsync: cancel, isPending } = useCancelLeave();

  if (!CAN_CANCEL.includes(item.status)) return null;

  async function handleCancel(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await cancel(item.id);
      setConfirm(false);
    } catch {
      // error shown inline
    }
  }

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
      className="shrink-0 flex items-center gap-1 rounded-lg border border-destructive/40 px-2 py-1 text-xs font-medium text-destructive active:bg-destructive/10"
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

export default function LeavesPage() {
  const [activeStatus, setActiveStatus] = useState<LeaveStatus | undefined>(
    undefined,
  );
  const { data, isLoading } = useMyLeaves({ status: activeStatus });

  return (
    <>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3">
        <PageHeader title="ประวัติการลา" />
        <Link
          className="rounded-full bg-primary px-3 py-1 text-sm font-medium text-white"
          href="leaves/balance"
        >
          ตรวจสอบสิทธิ์
        </Link>
      </div>

      {/* ── Filter tabs ────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setActiveStatus(tab.value)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              activeStatus === tab.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-background border border-border text-muted-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 px-4 pb-28">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-whited" />
          ))
        ) : !data?.items.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 font-medium text-foreground">
              ยังไม่มีประวัติการลา
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              กดปุ่ม + เพื่อส่งคำขอลาใหม่
            </p>
            <Link
              href="/leaves/new"
              className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              ขอลาเลย
            </Link>
          </div>
        ) : (
          data.items.map((item) => (
            <Link
              key={item.id}
              href={`/leaves/${item.id}`}
              className="flex items-center gap-4 rounded-2xl border border-border bg-background p-4 shadow-sm active:bg-whited/50 transition-colors"
            >
              {/* Date block */}
              <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl py-2 text-center">
                <span className="text-[10px] font-medium text-red-500">
                  {new Date(item.dateFrom).toLocaleDateString("en-US", {
                    weekday: "short",
                    timeZone: "Asia/Bangkok",
                  })}
                </span>
                <span className="text-lg font-bold leading-none text-foreground">
                  {new Date(item.dateFrom).toLocaleDateString("en-US", {
                    day: "numeric",
                    timeZone: "Asia/Bangkok",
                  })}
                </span>
                {/* <span className="text-[10px] font-medium text-muted-foreground">
                  {new Date(item.dateFrom).toLocaleDateString("th-TH", {
                    month: "short",
                    timeZone: "Asia/Bangkok",
                  })}
                </span> */}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 border-l border-border pl-4">
                <p className="font-semibold text-foreground truncate">
                  {item.leaveTypeName}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {formatDateTH(item.dateFrom)}
                  {item.dateFrom !== item.dateTo &&
                    ` – ${formatDateTH(item.dateTo)}`}
                  {" · "}
                  {item.totalDays} วัน
                </p>
              </div>

              {/* Badge + Cancel */}
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <LeaveStatusBadge status={item.status} />
                <CancelInline item={item} />
              </div>
            </Link>
          ))
        )}
      </div>

      {/* FAB */}
      <Link
        href="/leaves/new"
        className="fixed bottom-24 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg active:opacity-90 transition-opacity"
      >
        <Plus className="h-6 w-6 text-primary-foreground" />
      </Link>
    </>
  );
}
