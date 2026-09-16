"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { TicketDetailDto } from "@hrms/shared-types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import {
  useCloseTicket,
  useRejectTicket,
  useReturnTicketForRevision,
} from "@/hooks/use-tickets";
import { useApiError } from "@/hooks/use-api-error";

/** ปฏิเสธใบแจ้งเรื่องตั้งแต่ต้น (Supervisor) */
export function RejectModal({
  ticket,
  onClose,
}: {
  ticket: TicketDetailDto;
  onClose: () => void;
}) {
  const t = useTranslations("admin.ticket.review");
  const tCommon = useTranslations("common");
  const apiError = useApiError();
  const reject = useRejectTicket(ticket.id);
  const [reason, setReason] = useState("");

  async function submit() {
    if (!reason.trim()) return toast.error(t("reasonRequired"));
    try {
      await reject.mutateAsync({
        reason: reason.trim(),
        expectedUpdatedAt: ticket.updatedAt,
      });
      toast.success(t("rejected"));
      onClose();
    } catch (error) {
      toast.error(apiError(error, tCommon("state.error")));
    }
  }

  return (
    <Modal open onClose={onClose} title={t("rejectTitle")} size="sm">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t("reason")}</Label>
          <textarea
            rows={5}
            maxLength={1000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {tCommon("action.cancel")}
          </Button>
          <Button
            variant="destructive"
            loading={reject.isPending}
            onClick={submit}
          >
            {t("confirmReject")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** ตรวจรับงานที่ส่งมา: ส่งกลับแก้ไข หรือ ตรวจผ่านและปิดงาน */
export function ReviewModal({
  ticket,
  mode,
  onClose,
}: {
  ticket: TicketDetailDto;
  mode: "return" | "close";
  onClose: () => void;
}) {
  const t = useTranslations("admin.ticket.review");
  const tCommon = useTranslations("common");
  const apiError = useApiError();
  const returnTicket = useReturnTicketForRevision(ticket.id);
  const closeTicket = useCloseTicket(ticket.id);
  const [note, setNote] = useState("");
  const isReturn = mode === "return";
  const pending = returnTicket.isPending || closeTicket.isPending;

  async function submit() {
    if (isReturn && !note.trim())
      return toast.error(t("returnRequired"));
    try {
      if (isReturn) {
        await returnTicket.mutateAsync({
          reviewNote: note.trim(),
          expectedUpdatedAt: ticket.updatedAt,
        });
        toast.success(t("returned"));
      } else {
        await closeTicket.mutateAsync({
          reviewNote: note.trim() || undefined,
          expectedUpdatedAt: ticket.updatedAt,
        });
        toast.success(t("closed"));
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
      title={isReturn ? t("returnTitle") : t("closeTitle")}
      size="sm"
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>{isReturn ? t("returnNote") : t("closeNote")}</Label>
          <textarea
            rows={5}
            maxLength={2000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {tCommon("action.cancel")}
          </Button>
          <Button
            variant={isReturn ? "outline" : "default"}
            loading={pending}
            onClick={submit}
          >
            {isReturn ? t("confirmReturn") : t("confirmClose")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
