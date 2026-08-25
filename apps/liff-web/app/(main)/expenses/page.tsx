"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Banknote,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FilePlus2,
  Paperclip,
  Plus,
  ReceiptText,
} from "lucide-react";
import type {
  ExpenseClaimDto,
  ExpenseClaimStatus,
  ExpenseClaimType,
} from "@hrms/shared-types";
import { PageHeader } from "@/components/layout/page-header";
import { useMyExpenses } from "@/hooks/use-expenses";

const PAGE_SIZE = 20;

const STATUS_TABS: { label: string; value?: ExpenseClaimStatus }[] = [
  { label: "ทั้งหมด" },
  { label: "แบบร่าง", value: "Draft" },
  { label: "รอตรวจ", value: "Pending" },
  { label: "อนุมัติแล้ว", value: "Approved" },
  { label: "เข้ารอบวางบิล", value: "Batched" },
  { label: "จ่ายแล้ว", value: "Paid" },
  { label: "ไม่อนุมัติ", value: "Rejected" },
  { label: "ยกเลิก", value: "Cancelled" },
];

const STATUS_LABEL: Record<ExpenseClaimStatus, string> = {
  Draft: "แบบร่าง",
  Pending: "รอตรวจ",
  Approved: "อนุมัติแล้ว",
  Rejected: "ไม่อนุมัติ",
  Cancelled: "ยกเลิก",
  Batched: "เข้ารอบวางบิล",
  Paid: "จ่ายแล้ว",
};

const STATUS_TONE: Record<ExpenseClaimStatus, string> = {
  Draft: "border-slate-200 bg-slate-50 text-slate-700",
  Pending: "border-amber-200 bg-amber-50 text-amber-800",
  Approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Rejected: "border-red-200 bg-red-50 text-red-700",
  Cancelled: "border-slate-200 bg-slate-100 text-slate-600",
  Batched: "border-blue-200 bg-blue-50 text-blue-700",
  Paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const TYPE_LABEL: Record<ExpenseClaimType, string> = {
  Fuel: "ค่าน้ำมัน",
  Toll: "ค่าทางด่วน",
  Parking: "ค่าจอดรถ",
  Meal: "ค่าอาหาร",
  Other: "อื่น ๆ",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00`),
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function ExpenseCard({ item }: { item: ExpenseClaimDto }) {
  return (
    <Link
      href={`/expenses/${item.id}`}
      className="block rounded-lg border border-border bg-background p-4 shadow-sm transition-colors active:bg-muted/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {TYPE_LABEL[item.type]}
            </span>
            {item.billNo && (
              <span className="text-xs font-semibold text-muted-foreground">
                {item.billNo}
              </span>
            )}
          </div>
          <p className="mt-2 truncate text-sm font-semibold">
            {item.merchantName ||
              item.customerName ||
              item.origin ||
              "รายการสร้างบิล"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(item.expenseDate)}
            </span>
            {item.vehicleNo && <span>รถ {item.vehicleNo}</span>}
            {item.plateNo && <span>ทะเบียน {item.plateNo}</span>}
            <span className="flex items-center gap-1">
              <Paperclip className="h-3.5 w-3.5" />
              {item.attachmentUrls.length} ไฟล์
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-foreground">
            {formatMoney(item.amount)}
          </p>
          <p className="text-[10px] text-muted-foreground">บาท</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span
          className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${STATUS_TONE[item.status]}`}
        >
          {STATUS_LABEL[item.status]}
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-primary">
          รายละเอียด <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

export default function ExpensesPage() {
  const [status, setStatus] = useState<ExpenseClaimStatus | undefined>();
  const { data, isLoading } = useMyExpenses({
    status,
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const items = data?.items ?? [];

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <PageHeader
        title="สร้างบิล"
        subtitle={`${data?.totalCount ?? 0} รายการ`}
      />

      <div className="flex gap-2 overflow-x-auto border-b border-border bg-background px-4 py-3">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setStatus(tab.value)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              status === tab.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-border bg-background text-muted-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3 px-4 pt-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-lg bg-background"
            />
          ))
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background px-4 py-16 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 font-semibold text-foreground">
              ยังไม่มีรายการสร้างบิล
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              แนบใบเสร็จหรือใบนำจ่ายเพื่อส่งรายการใหม่
            </p>
            <Link
              href="/expenses/new"
              className="mt-5 flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <FilePlus2 className="h-4 w-4" />
              สร้างบิล
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ReceiptText className="h-4 w-4 text-primary" />
                  จำนวนรายการ
                </div>
                <p className="mt-1 text-xl font-bold">
                  {data?.totalCount ?? items.length}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Banknote className="h-4 w-4 text-emerald-600" />
                  ยอดรวมหน้านี้
                </div>
                <p className="mt-1 text-xl font-bold">
                  {formatMoney(
                    items.reduce((sum, item) => sum + item.amount, 0),
                  )}
                </p>
              </div>
            </div>
            {items.map((item) => (
              <ExpenseCard key={item.id} item={item} />
            ))}
          </>
        )}
      </div>

      <Link
        href="/expenses/new"
        className="fixed bottom-24 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg transition-opacity active:opacity-90"
      >
        <Plus className="h-6 w-6 text-primary-foreground" />
      </Link>
    </div>
  );
}
