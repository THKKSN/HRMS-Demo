"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Crown, Sparkles, UserRoundPlus, UserRoundX, Users } from "lucide-react";
import { toast } from "sonner";
import type {
  TicketAssignmentCandidateDto,
  TicketDetailDto,
  TicketTeamMemberDto,
} from "@hrms/shared-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import {
  useAddTicketTeamMembers,
  useApplyTicketTeamTemplate,
  useRemoveTicketTeamMember,
  useTicketTeamTemplateOptions,
} from "@/hooks/use-tickets";
import { ticketDateTime } from "./ticket-detail-shared";
import { useApiError } from "@/hooks/use-api-error";

/** ทีมงานของใบแจ้งเรื่อง — ผู้รับผิดชอบหลัก 1 คน + ผู้ร่วมงานที่ถูกดึงเข้ามาช่วย */
export function TeamPanel({
  ticket,
  candidates,
}: {
  ticket: TicketDetailDto;
  candidates: TicketAssignmentCandidateDto[];
}) {
  const t = useTranslations("admin.ticket.team");
  const tCommon = useTranslations("common");
  const apiError = useApiError();
  const removeMember = useRemoveTicketTeamMember(ticket.id);
  const applyTemplate = useApplyTicketTeamTemplate(ticket.id);
  const templateOptions = useTicketTeamTemplateOptions(
    ticket.id,
    ticket.actions.canManageTeam,
  );
  const [showAdd, setShowAdd] = useState(false);
  const [applyingId, setApplyingId] = useState<string>();
  const [removingId, setRemovingId] = useState<string>();
  // คนที่กำลังจะถอนออก — ใช้ ConfirmModal ของระบบแทน window.confirm ที่หน้าตาไม่เข้ากับ UI
  const [removeTarget, setRemoveTarget] = useState<TicketTeamMemberDto | null>(null);
  const owner = ticket.teamMembers.find(
    (member) => member.memberRole === "Owner",
  );
  const members = ticket.teamMembers.filter(
    (member) => member.memberRole === "Member",
  );

  async function confirmRemove() {
    if (!removeTarget) return;
    setRemovingId(removeTarget.employeeId);
    try {
      await removeMember.mutateAsync({
        employeeId: removeTarget.employeeId,
        expectedUpdatedAt: ticket.updatedAt,
      });
      toast.success(t("removed", { name: removeTarget.employeeName }));
      setRemoveTarget(null);
    } catch (error) {
      toast.error(apiError(error, tCommon("state.error")));
    } finally {
      setRemovingId(undefined);
    }
  }

  async function runTemplate(templateId: string) {
    setApplyingId(templateId);
    try {
      await applyTemplate.mutateAsync({
        templateId,
        expectedUpdatedAt: ticket.updatedAt,
      });
      toast.success(t("templateApplied"));
    } catch (error) {
      toast.error(apiError(error, tCommon("state.error")));
    } finally {
      setApplyingId(undefined);
    }
  }

  const usableTemplates = (templateOptions.data ?? []).filter(
    (option) => option.addableCount > 0,
  );

  return (
    <section>
      <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4 text-muted-foreground" />
          {t("title")}
        </h2>
        {ticket.actions.canManageTeam && (
          <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
            <UserRoundPlus className="h-4 w-4" /> {t("addMember")}
          </Button>
        )}
      </div>

      {!owner ? (
        <p className="py-6 text-sm text-muted-foreground">{t("noOwner")}</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {[owner, ...members].map((member) => (
            <li
              key={member.assignmentId}
              className="flex items-start justify-between gap-3 py-3 text-sm"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{member.employeeName}</span>
                  {member.memberRole === "Owner" ? (
                    <Badge variant="success">
                      <Crown className="mr-1 h-3 w-3" />
                      {t("owner")}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">{t("member")}</Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[
                    member.employeeCode,
                    member.departmentName,
                    ticketDateTime(member.assignedAt),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {member.assignedByEmployeeName && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("addedBy", { name: member.assignedByEmployeeName })}
                  </p>
                )}
                {member.note && (
                  <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                    {member.note}
                  </p>
                )}
              </div>
              {member.canRemove && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 text-destructive"
                  loading={removingId === member.employeeId}
                  disabled={!!removingId}
                  onClick={() => setRemoveTarget(member)}
                >
                  <UserRoundX className="h-4 w-4" /> {t("remove")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {owner && ticket.actions.canManageTeam && usableTemplates.length > 0 && (
        <div className="mt-3 space-y-2 rounded-md border border-dashed border-border p-3">
          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> {t("templates")}
          </p>
          <div className="flex flex-wrap gap-2">
            {usableTemplates.map((option) => (
              <Button
                key={option.id}
                size="sm"
                variant="outline"
                loading={applyingId === option.id}
                disabled={!!applyingId}
                onClick={() => runTemplate(option.id)}
              >
                {/* option.name = ชื่อทีมสำเร็จรูปที่ HR ตั้งเอง (ข้อมูล ไม่แปล) */}
                {option.name} (+{option.addableCount})
                {option.isCompanyWide ? t("templateCompanyWide") : ""}
              </Button>
            ))}
          </div>
        </div>
      )}

      <p className="pt-2 text-xs text-muted-foreground">{t("memberHint")}</p>

      {showAdd && (
        <AddTeamMembersModal
          ticket={ticket}
          candidates={candidates}
          onClose={() => setShowAdd(false)}
        />
      )}

      <ConfirmModal
        open={!!removeTarget}
        title={t("removeTitle")}
        description={
          removeTarget
            ? t("removeDescription", { name: removeTarget.employeeName })
            : undefined
        }
        confirmLabel={t("confirmRemove")}
        variant="destructive"
        loading={!!removingId}
        onConfirm={confirmRemove}
        onClose={() => setRemoveTarget(null)}
      />
    </section>
  );
}

/** เลือกผู้ร่วมงานหลายคนพร้อมกัน — ตัดคนที่อยู่ในทีมแล้วและผู้แจ้งเรื่องออกจากรายการ */
function AddTeamMembersModal({
  ticket,
  candidates,
  onClose,
}: {
  ticket: TicketDetailDto;
  candidates: TicketAssignmentCandidateDto[];
  onClose: () => void;
}) {
  const t = useTranslations("admin.ticket.team");
  const tCommon = useTranslations("common");
  const apiError = useApiError();
  const addMembers = useAddTicketTeamMembers(ticket.id);
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const inTeam = new Set(ticket.teamMembers.map((member) => member.employeeId));
  const options = candidates.filter(
    (candidate) =>
      !inTeam.has(candidate.employeeId) &&
      candidate.employeeId !== ticket.requesterEmployeeId,
  );

  function toggle(employeeId: string) {
    setSelected((current) =>
      current.includes(employeeId)
        ? current.filter((item) => item !== employeeId)
        : [...current, employeeId],
    );
  }

  async function submit() {
    if (selected.length === 0) return toast.error(t("selectRequired"));
    try {
      await addMembers.mutateAsync({
        employeeIds: selected,
        note: note.trim() || undefined,
        expectedUpdatedAt: ticket.updatedAt,
      });
      toast.success(t("added"));
      onClose();
    } catch (error) {
      toast.error(apiError(error, tCommon("state.error")));
    }
  }

  return (
    <Modal open onClose={onClose} title={t("addTitle")}>
      <div className="space-y-4">
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noCandidates")}</p>
        ) : (
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-border p-2">
            {options.map((candidate) => (
              <label
                key={candidate.employeeId}
                className="flex cursor-pointer items-start gap-3 rounded-md p-2 text-sm hover:bg-muted/60"
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={selected.includes(candidate.employeeId)}
                  onChange={() => toggle(candidate.employeeId)}
                />
                <span className="min-w-0">
                  <span className="font-medium">{candidate.employeeName}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {[
                      candidate.employeeCode,
                      candidate.departmentName,
                      t("activeCount", { count: candidate.activeTicketCount }),
                      candidate.teamTicketCount > 0
                        ? t("teamCount", { count: candidate.teamTicketCount })
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="team-note">{t("scopeLabel")}</Label>
          <textarea
            id="team-note"
            rows={3}
            maxLength={1000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t("scopePlaceholder")}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {tCommon("action.cancel")}
          </Button>
          <Button
            loading={addMembers.isPending}
            disabled={selected.length === 0}
            onClick={submit}
          >
            {selected.length > 0 ? t("addCount", { count: selected.length }) : t("add")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
