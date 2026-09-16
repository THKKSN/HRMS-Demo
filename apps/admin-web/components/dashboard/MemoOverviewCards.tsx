"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { localizedName, type Locale } from "@hrms/i18n";
import { FileText } from "lucide-react";
import {
  MiniBar,
  RANK_BADGE,
  rankBarClass,
} from "@/components/tickets/ticket-report-ui";
import { useMemoOverview } from "@/hooks/use-memo-reports";
import { useMemoSections } from "@/components/memos/memo-section-nav";
import type { MemoReportParams } from "@/lib/memo-reports.api";
import type { MemoOverviewDto } from "@hrms/shared-types";

// เรียงตามลำดับที่เรื่องเดินจริง: รออนุมัติ → ดำเนินการ → เสร็จสิ้น แล้วปิดท้ายด้วยเรื่องที่ตกไป
// key ตรงกับคีย์ข้อความใน messages (admin.dashboard.memoOverview.status.*)
const STATUS_ROWS: {
  key: "pending" | "inProgress" | "completed" | "rejected";
  pick: (data: MemoOverviewDto) => number;
  valueClass: string;
  bar: string;
}[] = [
  {
    key: "pending",
    pick: (d) => d.pendingCount,
    valueClass: "text-amber-700 dark:text-amber-300",
    bar: "bg-amber-400",
  },
  {
    key: "inProgress",
    pick: (d) => d.inProgressCount,
    valueClass: "text-indigo-700 dark:text-indigo-300",
    bar: "bg-indigo-400",
  },
  {
    key: "completed",
    pick: (d) => d.completedCount,
    valueClass: "text-emerald-700 dark:text-emerald-300",
    bar: "bg-emerald-400",
  },
  {
    key: "rejected",
    pick: (d) => d.rejectedCount,
    valueClass: "text-rose-700 dark:text-rose-300",
    bar: "bg-rose-400",
  },
];

// ภาพรวม Memo บน dashboard — สถานะ 2×2 + หัวข้อที่ถูกขอมากที่สุด
// รูปแถวเดียวกับ "เวลาเฉลี่ย + กราฟแนวโน้ม" ของฝั่ง ticket เพื่อให้ทั้งหน้าอ่านเป็นจังหวะเดียวกัน
// ขอบเขตข้อมูลกรองที่ backend ตามบทบาท: Admin/Executive เห็นทุกบริษัท · Supervisor เห็นเฉพาะแผนกปลายทางของตัวเอง
export function MemoOverviewCards({
  params,
  rangeLabel,
}: {
  params: MemoReportParams;
  rangeLabel: string;
}) {
  const t = useTranslations("admin.dashboard.memoOverview");
  const { data, isLoading, isError } = useMemoOverview({
    ...params,
    topLimit: 8,
  });
  const { defaultHref } = useMemoSections();

  // 403 (ไม่มีทั้ง memo:approve และ memo:view-inbox) — ซ่อนทั้งบล็อก
  if (isError) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-xl bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
            <FileText className="h-4 w-4" />
          </span>
          <p className="text-sm font-semibold">{t("title")}</p>
          <span className="text-xs text-muted-foreground">
            · {rangeLabel}
            {data &&
              ` · ${data.meta.appliedScope === "All" ? t("scopeAll") : t("scopeDepartment")}`}
          </span>
        </div>
        <Link
          href={defaultHref}
          className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
        >
          {t("goToMemo")}
        </Link>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="h-48 animate-pulse rounded-2xl bg-muted" />
          <div className="h-48 animate-pulse rounded-2xl bg-muted lg:col-span-2" />
        </div>
      ) : (
        <MemoOverviewBody data={data} />
      )}
    </section>
  );
}

function MemoOverviewBody({ data }: { data: MemoOverviewDto }) {
  const t = useTranslations("admin.dashboard.memoOverview");
  const locale = useLocale() as Locale;
  // Admin/Executive เห็นข้ามบริษัท จึงต้องบอกด้วยว่าแต่ละหัวข้อวิ่งเข้าแผนกไหน
  // Supervisor ไม่ต้อง — ทุกแถวคือแผนกตัวเองอยู่แล้ว
  const isAllScope = data.meta.appliedScope === "All";
  const maxCount = data.topTopics[0]?.totalCount ?? 0;

  return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
      {/* หัวข้อที่ถูกขอมากที่สุด */}
      <div className="rounded-2xl border border-border bg-background p-4 shadow-sm lg:col-span-2">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold">{t("topSubjects")}</p>
          <p className="shrink-0 text-xs text-muted-foreground">
            {t("totalCount", { count: data.totalCount })}
          </p>
        </div>

        {data.topTopics.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("empty")}
          </p>
        ) : (
          <ul className="space-y-2.5">
            {data.topTopics.map((item, index) => (
              <li
                key={`${item.memoTypeId}-${item.categoryName}-${item.subCategoryName}`}
              >
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">
                    {RANK_BADGE[index] ?? `${index + 1}.`}{" "}
                    {localizedName({ name: item.memoTypeName, nameEn: item.memoTypeNameEn, nameId: item.memoTypeNameId }, locale)}
                    <span className="text-muted-foreground">
                      {" · "}
                      {[item.categoryName, item.subCategoryName]
                        .filter(Boolean)
                        .join(" / ")}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-indigo-700 dark:text-indigo-300">
                    {item.totalCount}
                  </span>
                </div>
                <MiniBar
                  value={item.totalCount}
                  max={maxCount}
                  className={rankBarClass(index, "indigo")}
                />
                {/* แยกให้เห็นว่าที่ขอมาค้างอยู่ขั้นไหน — ผู้บริหารดูได้ว่าหัวข้อไหนติดคอขวด */}
                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                  {/* ชื่อแผนกแปลได้ (master data ปัจจุบัน) ส่วนหมวด/หมวดย่อยด้านบนเป็น snapshot จึงคงภาษาไทย */}
                  {isAllScope &&
                    `${localizedName({ name: item.targetDepartmentName, nameEn: item.targetDepartmentNameEn, nameId: item.targetDepartmentNameId }, locale)} · `}
                  {t("itemCounts", {
                    pending: item.pendingCount,
                    inProgress: item.inProgressCount,
                    completed: item.completedCount,
                  })}
                  {item.rejectedCount > 0 &&
                    t("itemRejected", { rejected: item.rejectedCount })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
        {/* สถานะ Memo — ใช้ทรงบรรทัดข้อมูลเดียวกับการ์ดหัวข้อ (ชื่อซ้าย · ตัวเลขขวา · แถบสัดส่วนใต้บรรทัด) */}
      <div className="rounded-2xl border border-border bg-background p-4 shadow-sm lg:col-span-2">
          <p className="mb-3 text-sm font-semibold">{t("statusTitle")}</p>
          <ul className="space-y-2.5">
            {STATUS_ROWS.map((row) => {
              const value = row.pick(data);
              return (
                <li key={row.key}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-muted-foreground">
                      {t(`status.${row.key}`)}
                    </span>
                    <span
                      className={`shrink-0 font-semibold tabular-nums ${row.valueClass}`}
                    >
                      {value}
                    </span>
                  </div>
                  <MiniBar
                    value={value}
                    max={data.totalCount}
                    className={row.bar}
                  />
                </li>
              );
            })}
          </ul>
        </div>
    </div>
  );
}
