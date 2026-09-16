"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type {
  TicketAssignmentCandidateDto,
  TicketDetailDto,
} from "@hrms/shared-types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useMe } from "@/hooks/use-me";
import { useAssignTicket } from "@/hooks/use-tickets";
import { useApiError } from "@/hooks/use-api-error";

export function AssignModal({
  ticket,
  candidates,
  onClose,
}: {
  ticket: TicketDetailDto;
  candidates: TicketAssignmentCandidateDto[];
  onClose: () => void;
}) {
  const t = useTranslations("admin.ticket.assign");
  const tCommon = useTranslations("common");
  const apiError = useApiError();
  const assign = useAssignTicket(ticket.id);
  const { data: me } = useMe();
  const [employeeId, setEmployeeId] = useState(
    ticket.currentAssignment?.assignedToEmployeeId ?? "",
  );
  const [note, setNote] = useState("");
  // งานที่เริ่มดำเนินการแล้ว backend บังคับให้ระบุเหตุผลที่เปลี่ยนตัว (AssignTicketCommand)
  // ต้องบอกในฟอร์มให้ชัด ไม่ปล่อยให้ผู้ใช้เจอ error หลังกดยืนยัน
  const noteRequired =
    ticket.status === "InProgress" || ticket.status === "WaitingInfo";
  // ผู้แจ้งที่เป็นหัวหน้าแผนกปลายทางต้องจ่ายงานเข้าตัวเองได้ (เปิดเรื่องเองแล้วทำเอง)
  // จึงห้ามตัดตัวเองออกเพราะเป็นผู้แจ้ง — ตัดเฉพาะกรณีที่ถือใบนี้อยู่แล้ว (กดไปก็ไม่เกิดอะไร)
  const selfCandidate = me?.id
    ? candidates.find((candidate) => candidate.employeeId === me.id)
    : undefined;
  const alreadyMine =
    !!me?.id && me.id === ticket.currentAssignment?.assignedToEmployeeId;
  const canPickSelf = !!selfCandidate && !alreadyMine;
  // รายชื่อมีเฉพาะพนักงานของบริษัทปลายทาง — บัญชีข้ามบริษัทจะไม่อยู่ในลิสต์และ backend ก็ปฏิเสธ
  const selfOutOfScope = !!me?.id && !selfCandidate;

  async function submit() {
    if (!employeeId) return toast.error(t("assigneeRequired"));
    if (noteRequired && !note.trim()) {
      return toast.error(t("reasonRequired"));
    }
    try {
      await assign.mutateAsync({
        assignedToEmployeeId: employeeId,
        note: note.trim() || undefined,
        expectedUpdatedAt: ticket.updatedAt,
      });
      toast.success(ticket.currentAssignment ? t("reassigned") : t("assigned"));
      onClose();
    } catch (error) {
      toast.error(apiError(error, tCommon("state.error")));
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={ticket.currentAssignment ? t("reassignTitle") : t("assignTitle")}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor="assignee">{t("assignee")}</Label>
            {canPickSelf && (
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => setEmployeeId(me!.id)}
              >
                {t("assignSelf")}
              </button>
            )}
          </div>
          <Select
            id="assignee"
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
          >
            <option value="">{t("selectEmployee")}</option>
            {candidates.map((candidate) => (
              <option key={candidate.employeeId} value={candidate.employeeId}>
                {candidate.isRecommended ? t("recommended") : ""}
                {candidate.employeeName}
                {me?.id === candidate.employeeId ? t("me") : ""}
                {!candidate.isInTargetDepartment && candidate.departmentName
                  ? ` · ${candidate.departmentName}`
                  : ""}
                {" · "}
                {candidate.employeeCode} · {t("activeCount", { count: candidate.activeTicketCount })}
                {candidate.teamTicketCount > 0
                  ? t("teamCount", { count: candidate.teamTicketCount })
                  : ""}
              </option>
            ))}
          </Select>
          {alreadyMine && (
            <p className="text-xs text-muted-foreground">{t("alreadyMine")}</p>
          )}
          {selfOutOfScope && (
            <p className="text-xs text-muted-foreground">{t("selfOutOfScope")}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="assign-note">
            {noteRequired ? t("reasonLabel") : t("noteLabel")}
          </Label>
          <textarea
            id="assign-note"
            rows={4}
            maxLength={1000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={noteRequired ? t("reasonPlaceholder") : undefined}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          {noteRequired && (
            <p className="text-xs text-muted-foreground">{t("reasonHint")}</p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {tCommon("action.cancel")}
          </Button>
          <Button loading={assign.isPending} onClick={submit}>
            {t("confirm")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
