"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, CornerUpLeft, XCircle } from "lucide-react";
import { MemoStatusStation } from "@/components/memos/memo-status-station";
import { MemoActivityFeed } from "@/components/memos/memo-activity-feed";
import { MemoAttachmentList } from "@/components/memos/memo-attachment-list";
import type { MemoDto } from "@hrms/shared-types";
import * as fmt from "@hrms/i18n/format";

function dateTime(value?: string) {
  return value
    ? fmt.formatDateTime(new Date(value), {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

// การ์ดผลการพิจารณา — ความเห็นตอนอนุมัติ (เขียว) / เหตุผลตอนไม่อนุมัติ (แดง)
function DecisionCard({
  tone,
  title,
  by,
  at,
  text,
}: {
  tone: "approved" | "rejected";
  title: string;
  by?: string;
  at?: string;
  text: string;
}) {
  const approved = tone === "approved";
  const Icon = approved ? CheckCircle2 : XCircle;
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        approved
          ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-900"
          : "border-red-200 bg-red-50/60 dark:border-red-800 dark:bg-red-900"
      }`}
    >
      <h2
        className={`flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b pb-2 text-sm font-semibold ${
          approved
            ? "border-emerald-200 text-emerald-900 dark:border-emerald-700 dark:text-white"
            : "border-red-200 text-red-900 dark:border-red-700 dark:text-white"
        }`}
      >
        <span className="inline-flex items-center gap-1.5">
          <Icon className="h-4 w-4" />
          {title}
        </span>
        {(by || at) && (
          <span
            className={`text-xs font-normal ${
              approved
                ? "text-muted-foreground dark:text-emerald-200/80"
                : "text-muted-foreground dark:text-red-200/80"
            }`}
          >
            {by ?? "—"}
            {at ? ` · ${dateTime(at)}` : ""}
          </span>
        )}
      </h2>
      <p
        className={`mt-3 whitespace-pre-wrap text-sm ${
          approved
            ? "text-emerald-800 dark:text-emerald-50"
            : "text-red-800 dark:text-red-50"
        }`}
      >
        {text}
      </p>
    </div>
  );
}

// เนื้อหา standard ของหน้า Memo detail — ใช้ร่วมกันทุก role (ปุ่ม action อยู่ที่ header ของแต่ละหน้า)
// ใคร/เมื่อไหร่ ของแต่ละขั้นแสดงใน Status Station แล้ว — ไม่มี timeline แยก
export function MemoDetailBody({ memo }: { memo: MemoDto }) {
  const t = useTranslations("admin.memo.detail");
  // มีผลการพิจารณาให้แสดงหรือยัง — ใช้ตัดสินว่าแบ่งซ้าย/ขวาหรือให้รายละเอียดเต็มแถว
  const hasDecision =
    (memo.status === "Approved" && !!memo.approveComment) ||
    memo.status === "Rejected";

  const steps = memo.steps ?? [];

  return (
    <div className="space-y-5">
      <MemoStatusStation memo={memo} />

      {/* Status Station แสดงไม่ได้ว่าเรื่องถูกพักรอผู้ขอ เพราะไม่มีสถานีไหนเป็นคิวปัจจุบัน — บอกตรงนี้แทน */}
      {memo.returnedToRequesterAt && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4 shadow-sm dark:border-amber-700 dark:bg-amber-950/40">
          <h2 className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-amber-200 pb-2 text-sm font-semibold text-amber-900 dark:border-amber-700 dark:text-amber-50">
            <span className="inline-flex items-center gap-1.5">
              <CornerUpLeft className="h-4 w-4" />
              {t("returnedTitle")}
            </span>
            <span className="text-xs font-normal text-muted-foreground dark:text-amber-200/80">
              {dateTime(memo.returnedToRequesterAt)}
            </span>
          </h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-amber-800 dark:text-amber-50">
            {memo.returnedToRequesterReason ?? t("noReason")}
          </p>
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-200/80">
            {t("returnedNote")}
          </p>
        </div>
      )}

      {/* ซ้าย = ตัวเรื่อง · ขวา = บันทึกความคืบหน้าที่ปักไว้ให้อ่านเรื่องพร้อมเขียนได้ (โครงเดียวกับ tickets/[id]) */}
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <section>
            <h2 className="border-b border-border pb-2 text-sm font-semibold">
              {t("infoTitle")}
            </h2>
            {/* ชื่อประเภท/หมวด/บริษัท/แผนกเป็น snapshot ตอนสร้างเรื่อง — ไม่แปลย้อนหลังตามแผนข้อ 9 */}
            <dl className="divide-y divide-border">
              <InfoRow label={t("memoNo")} value={memo.memoNo} />
              <InfoRow label={t("memoType")} value={memo.memoTypeName} />
              <InfoRow
                label={t("category")}
                value={`${memo.memoCategoryNameSnapshot} / ${memo.memoSubCategoryNameSnapshot}`}
              />
              <InfoRow label={t("requester")} value={memo.requesterName} />
              <InfoRow
                label={t("requesterOrg")}
                value={`${memo.companyName} / ${memo.departmentName}`}
              />
              <InfoRow
                label={t("submittedAt")}
                value={dateTime(memo.createdAt)}
              />
            </dl>
          </section>

          {/* รายละเอียดเรื่องจับคู่กับผลการพิจารณา — ยังไม่มีผลก็ให้รายละเอียดกินเต็มแถว */}
          <section
            className={`grid items-start gap-3 ${hasDecision ? "lg:grid-cols-2" : ""}`}
          >
            <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
              <h2 className="border-b border-border pb-2 text-sm font-semibold">
                {t("detailTitle")}
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm">{memo.detail}</p>
            </div>

            {memo.status === "Approved" && memo.approveComment && (
              <DecisionCard
                tone="approved"
                title={t("approveComment")}
                by={memo.approvedByName}
                at={memo.approvedAt}
                text={memo.approveComment}
              />
            )}

            {memo.status === "Rejected" && (
              <DecisionCard
                tone="rejected"
                title={t("rejectComment")}
                by={memo.approvedByName}
                at={memo.rejectedAt}
                text={memo.rejectReason ?? t("noReason")}
              />
            )}
          </section>

          {/* ผลการดำเนินการรายขั้นตอน — แสดงเฉพาะเรื่องที่ MemoType ตั้งขั้นตอนไว้ */}
          {steps.some((s) => s.actionNote) && (
            <section>
              {/* s.label = ชื่อขั้นตอนที่ HR ตั้งเอง (ข้อมูล ไม่แปล) */}
              <h2 className="border-b border-border pb-2 text-sm font-semibold">
                {t("stepNotes")}
              </h2>
              <dl className="divide-y divide-border">
                {steps
                  .filter((s) => s.actionNote)
                  .map((s) => (
                    <InfoRow
                      key={s.id}
                      label={`${s.label}${s.actedByName ? ` · ${s.actedByName}` : ""}`}
                      value={
                        <span className="whitespace-pre-wrap">{s.actionNote}</span>
                      }
                    />
                  ))}
              </dl>
            </section>
          )}

          <MemoAttachmentList
            attachments={memo.attachments ?? []}
            steps={steps}
          />
        </div>

        <div className="space-y-6">
          <MemoActivityFeed
            memoId={memo.id}
            activities={memo.activities ?? []}
            canAdd={!!memo.canAddActivity}
          />
        </div>
      </div>
    </div>
  );
}
