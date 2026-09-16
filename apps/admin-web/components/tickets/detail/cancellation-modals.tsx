"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { TicketDetailDto } from "@hrms/shared-types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import {
  useApproveTicketCancellation,
  useRejectTicketCancellation,
  useRequestTicketCancellation,
} from "@/hooks/use-tickets";
import { useApiError } from "@/hooks/use-api-error";

/** ผู้แจ้งส่งคำขอยกเลิก — ticket ยังไม่ถูกยกเลิกจนกว่าผู้ดูแลปลายทางจะอนุมัติ */
export function RequestCancellationModal({
  ticket,
  onClose,
}: {
  ticket: TicketDetailDto;
  onClose: () => void;
}) {
  const t = useTranslations("admin.ticket.cancellation");
  const tCommon = useTranslations("common");
  const apiError = useApiError();
  const requestCancellation = useRequestTicketCancellation(ticket.id);
  const [reason, setReason] = useState("");

  async function submit() {
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 1) {
      toast.error(t("reasonRequired"));
      return;
    }

    try {
      await requestCancellation.mutateAsync({
        reason: trimmedReason,
        expectedUpdatedAt: ticket.updatedAt,
      });
      toast.success(t("requested"));
      onClose();
    } catch (error) {
      toast.error(apiError(error, tCommon("state.error")));
    }
  }

  return (
    <Modal open onClose={onClose} title={t("requestTitle")} size="sm">
      <div className="space-y-4">
        {/* ชื่อแผนก/บริษัทเป็น snapshot ไทยจาก API — รอปรับ DTO ฝั่งผู้บริโภค */}
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {t("requestNotice", {
            department: ticket.targetDepartmentName ?? ticket.targetCompanyName,
          })}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ticket-cancellation-reason">{t("reasonLabel")}</Label>
          <textarea
            id="ticket-cancellation-reason"
            rows={5}
            maxLength={1000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            placeholder={t("reasonPlaceholder")}
          />
          <p className="text-right text-xs text-muted-foreground">
            {reason.length}/1000
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={requestCancellation.isPending}
            onClick={onClose}
          >
            {tCommon("action.cancel")}
          </Button>
          <Button
            variant="destructive"
            loading={requestCancellation.isPending}
            disabled={reason.trim().length < 1}
            onClick={submit}
          >
            {t("submitRequest")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** ผู้ดูแลปลายทางพิจารณาคำขอยกเลิก: อนุมัติ หรือ ไม่อนุมัติ */
export function CancellationReviewModal({
  ticket,
  decision,
  onClose,
}: {
  ticket: TicketDetailDto;
  decision: "approve" | "reject";
  onClose: () => void;
}) {
  const t = useTranslations("admin.ticket.cancellation");
  const tCommon = useTranslations("common");
  const apiError = useApiError();
  const approve = useApproveTicketCancellation(ticket.id);
  const reject = useRejectTicketCancellation(ticket.id);
  const [note, setNote] = useState("");
  const isApprove = decision === "approve";
  const isReviewing = approve.isPending || reject.isPending;

  async function submit() {
    if (!isApprove && !note.trim())
      return toast.error(t("rejectReasonRequired"));

    try {
      if (isApprove) {
        await approve.mutateAsync({
          reviewNote: note.trim() || undefined,
          expectedUpdatedAt: ticket.updatedAt,
        });
        toast.success(t("approved"));
      } else {
        await reject.mutateAsync({
          reviewNote: note.trim(),
          expectedUpdatedAt: ticket.updatedAt,
        });
        toast.success(t("rejected"));
      }
      onClose();
    } catch (error) {
      toast.error(apiError(error, tCommon("state.error")));
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isApprove ? t("approveTitle") : t("rejectTitle")}
      size="sm"
    >
      <div className="space-y-4">
        <div className="rounded-md bg-muted p-3 text-sm">
          <p className="font-semibold">
            {ticket.ticketNo} · {ticket.otherTopicText ?? ticket.title}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
            {ticket.latestCancellationRequest?.reason ?? "-"}
          </p>
        </div>
        {isApprove && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {t("approveNotice")}
          </div>
        )}
        <label className="block text-sm font-medium">
          {isApprove ? t("noteOptional") : t("rejectReasonLabel")}
          <textarea
            rows={5}
            maxLength={1000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="mt-2 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={isReviewing} onClick={onClose}>
            {tCommon("action.back")}
          </Button>
          <Button
            variant={isApprove ? "default" : "destructive"}
            loading={isReviewing}
            disabled={!isApprove && !note.trim()}
            onClick={submit}
          >
            {isApprove ? t("confirmApprove") : t("confirmReject")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
