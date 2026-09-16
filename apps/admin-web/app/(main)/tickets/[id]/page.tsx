"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  CheckCircle2,
  History,
  Pencil,
  Play,
  RotateCcw,
  Send,
  ShieldCheck,
  TriangleAlert,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatPhone } from "@hrms/i18n/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SourceChannelIcon } from "@/components/tickets/source-channel-icon";
import { AssignModal } from "@/components/tickets/detail/assign-modal";
import { BoardRuntimePanel } from "@/components/tickets/detail/board-runtime-panel";
import {
  CancellationReviewModal,
  RequestCancellationModal,
} from "@/components/tickets/detail/cancellation-modals";
import { CompletionModal } from "@/components/tickets/detail/completion-modal";
import { ConversationPanel } from "@/components/tickets/detail/conversation-panel";
import {
  RejectModal,
  ReviewModal,
} from "@/components/tickets/detail/review-modals";
import { StatusStationLine } from "@/components/tickets/detail/status-station-line";
import { TeamPanel } from "@/components/tickets/detail/team-panel";
import { AttachmentList } from "@/components/tickets/detail/ticket-attachments";
import {
  InfoRow,
  ticketDateTime,
} from "@/components/tickets/detail/ticket-detail-shared";
import { TicketEventsModal } from "@/components/tickets/detail/ticket-events-modal";
import { TriageModal } from "@/components/tickets/detail/triage-modal";
import {
  useAcceptTicket,
  useConfirmTicketCompletion,
  useStartTicket,
  useTicket,
  useTicketAssignmentCandidates,
  useTicketAssignmentHistory,
  useTicketReviews,
  useUpdateTicketWorkDetail,
} from "@/hooks/use-tickets";
import { TICKET_STATUS_CLASS } from "@/lib/ticket-status";
import { useApiError } from "@/hooks/use-api-error";

// หน้า detail ทำหน้าที่แค่ประกอบ section/modal — logic ของแต่ละส่วนอยู่ใน components/tickets/detail/*
type DetailModal =
  | "assign"
  | "triage"
  | "reject"
  | "return"
  | "close"
  | "completion"
  | "events"
  | "cancelRequest"
  | "approveCancellation"
  | "rejectCancellation"
  | null;

export default function TicketDetailPage() {
  const t = useTranslations("admin.ticket.detail");
  const tStatus = useTranslations("status.ticket");
  const tPriority = useTranslations("status.ticketPriority");
  const tCommon = useTranslations("common");
  const apiError = useApiError();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const ticketQuery = useTicket(id);
  const ticket = ticketQuery.data;
  const canViewAssignmentHistory =
    !!ticket &&
    !ticket.actions.isRequester &&
    (ticket.actions.canAssign || ticket.actions.canViewTicketReport);
  const historyQuery = useTicketAssignmentHistory(id, canViewAssignmentHistory);
  const candidatesQuery = useTicketAssignmentCandidates(
    id,
    // ผู้รับผิดชอบหลักที่จัดทีมได้ก็ต้องใช้รายชื่อนี้เลือกผู้ร่วมงาน
    !!ticket?.actions.canAssign || !!ticket?.actions.canManageTeam,
  );
  const reviewsQuery = useTicketReviews(id);
  const accept = useAcceptTicket(id);
  const confirmCompletion = useConfirmTicketCompletion(id);
  const startWork = useStartTicket(id);
  const saveWorkForStart = useUpdateTicketWorkDetail(id);
  const [modal, setModal] = useState<DetailModal>(null);
  const closeModal = () => setModal(null);

  async function acceptTicket() {
    if (!ticket) return;
    try {
      await accept.mutateAsync(ticket.updatedAt);
      toast.success(t("accepted"));
    } catch (error) {
      toast.error(apiError(error, tCommon("state.error")));
    }
  }

  async function startTicket() {
    if (!ticket) return;
    try {
      const saved = await saveWorkForStart.mutateAsync({
        expectedUpdatedAt: ticket.updatedAt,
      });
      await startWork.mutateAsync(saved.updatedAt);
      toast.success(t("started"));
    } catch (error) {
      toast.error(apiError(error, tCommon("state.error")));
    }
  }

  async function confirmTicketCompletion() {
    if (!ticket) return;
    try {
      await confirmCompletion.mutateAsync(ticket.updatedAt);
      toast.success(t("completionConfirmed"));
    } catch (error) {
      toast.error(apiError(error, tCommon("state.error")));
    }
  }

  if (ticketQuery.isLoading)
    return <div className="h-48 animate-pulse rounded-md bg-muted" />;
  if (!ticket)
    return (
      <div className="rounded-md border border-destructive/30 p-5 text-destructive">
        {t("notFound")}
      </div>
    );

  const createdAttachments = ticket.attachments.filter(
    (item) => item.stage === "Created",
  );
  const resolvedAttachments = ticket.attachments.filter(
    (item) => item.stage === "Resolved",
  );
  // สรุปการปิดจบงาน — ใช้หัวข้อชุดเดียวกับ modal บันทึกจบงาน ให้ผู้ตรวจรับและผู้แจ้งเรื่องเห็นข้อมูลตรงกัน
  const showCloseoutSummary =
    !!ticket.closeoutReasonName ||
    !!ticket.resolutionNote ||
    resolvedAttachments.length > 0 ||
    !!ticket.resolvedAt;
  const hasReceiverActions =
    ticket.actions.canAccept ||
    ticket.actions.canTriage ||
    ticket.actions.canAssign ||
    ticket.actions.canReject ||
    ticket.actions.canStart ||
    ticket.actions.canReturnForRevision ||
    ticket.actions.canClose ||
    ticket.actions.canResolve;
  const canReviewCancellation =
    ticket.actions.isReceiverSide &&
    ticket.latestCancellationRequest?.status === "Pending";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div className="min-w-0">
          <Link
            href="/tickets"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> {t("back")}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="flex items-center gap-1.5 text-xl font-semibold">
              <SourceChannelIcon
                channel={ticket.sourceChannel}
                className="h-5 w-5 shrink-0"
              />
              {ticket.ticketNo}
            </h1>
            <Badge
              className={TICKET_STATUS_CLASS[ticket.status]}
              data-ticket-status={ticket.status}
            >
              {tStatus(ticket.status)}
            </Badge>
            <Badge
              variant={
                ticket.priority === "Critical"
                  ? "destructive"
                  : ticket.priority === "High"
                    ? "warning"
                    : "secondary"
              }
            >
              {tPriority(ticket.priority)}
            </Badge>
          </div>
          {/* title = ชื่อหัวข้อ (subject) — เคส "อื่น ๆ" แสดงข้อความที่ผู้แจ้งระบุแทน */}
          <p className="mt-2 text-base font-medium">
            {ticket.otherTopicText ?? ticket.title}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button variant="outline" onClick={() => setModal("events")}>
            <History className="h-4 w-4" /> {t("eventsButton")} (
            {ticket.auditEvents.length})
          </Button>
          {ticket.actions.isRequester &&
            ticket.status === "AwaitingRequesterConfirmation" && (
              <Button
                loading={confirmCompletion.isPending}
                onClick={confirmTicketCompletion}
              >
                <CheckCircle2 className="h-4 w-4" /> {t("confirmCompletion")}
              </Button>
            )}
          {hasReceiverActions && (
            <div className="border-l-2 border-primary pl-3">
              <div className="flex flex-wrap justify-end gap-2">
                {ticket.actions.canAccept && (
                  <Button
                    variant="outline"
                    loading={accept.isPending}
                    onClick={acceptTicket}
                  >
                    <CheckCircle2 className="h-4 w-4" /> {t("accept")}
                  </Button>
                )}
                {ticket.actions.canTriage && (
                  <Button variant="outline" onClick={() => setModal("triage")}>
                    <Pencil className="h-4 w-4" /> {t("triage")}
                  </Button>
                )}
                {ticket.actions.canAssign && (
                  <Button onClick={() => setModal("assign")}>
                    <UserRoundCheck className="h-4 w-4" />{" "}
                    {ticket.currentAssignment ? t("reassign") : t("assign")}
                  </Button>
                )}
                {ticket.actions.canStart && (
                  <Button
                    loading={startWork.isPending || saveWorkForStart.isPending}
                    onClick={startTicket}
                  >
                    <Play className="h-4 w-4" /> {t("start")}
                  </Button>
                )}
                {ticket.actions.canReject && (
                  <Button
                    className="text-white"
                    variant="destructive"
                    onClick={() => setModal("reject")}
                  >
                    <XCircle className="h-4 w-4" /> {t("reject")}
                  </Button>
                )}
                {ticket.actions.canReturnForRevision && (
                  <Button variant="outline" onClick={() => setModal("return")}>
                    <RotateCcw className="h-4 w-4" /> {t("return")}
                  </Button>
                )}
                {ticket.actions.canClose && (
                  <Button onClick={() => setModal("close")}>
                    <ShieldCheck className="h-4 w-4" /> {t("close")}
                  </Button>
                )}
                {ticket.actions.canResolve && (
                  <Button onClick={() => setModal("completion")}>
                    <Send className="h-4 w-4" /> {t("resolve")}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <StatusStationLine
        categoryName={ticket.categoryName}
        topicName={ticket.topicName}
        subjectName={ticket.subjectName ?? ticket.title}
        status={ticket.status}
        workflowName={ticket.workflowName}
        workflowAutoAcknowledgeAfterDays={
          ticket.workflowAutoAcknowledgeAfterDays
        }
        workflowBoardSteps={ticket.workflowBoardSteps}
        workflowSteps={ticket.workflowSteps}
        workflowCurrentStepKey={ticket.workflowCurrentStepKey}
        workflowCurrentStepIndexByStatus={
          ticket.workflowCurrentStepIndexByStatus
        }
      />

      {ticket.actions.isRequester &&
        ticket.latestCancellationRequest?.status === "Pending" && (
          <div className="flex gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-500">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">{t("cancellationPending")}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm opacity-80">
                {ticket.latestCancellationRequest.reason}
              </p>
              <p className="mt-1 text-xs opacity-70">
                {t("sentAt", {
                  date: ticketDateTime(ticket.latestCancellationRequest.requestedAt),
                })}
              </p>
            </div>
          </div>
        )}

      {canReviewCancellation && (
        <div className="flex flex-wrap gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-500">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{t("cancellationReview")}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm opacity-80">
              {ticket.latestCancellationRequest?.reason}
            </p>
            <p className="mt-1 text-xs opacity-70">
              {t("sentAt", {
                date: ticketDateTime(ticket.latestCancellationRequest?.requestedAt),
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <Button
              variant="outline"
              onClick={() => setModal("rejectCancellation")}
            >
              <XCircle className="h-4 w-4" /> {t("rejectCancellation")}
            </Button>
            <Button onClick={() => setModal("approveCancellation")}>
              <CheckCircle2 className="h-4 w-4" /> {t("approveCancellation")}
            </Button>
          </div>
        </div>
      )}

      {ticket.actions.isRequester &&
        ticket.latestCancellationRequest?.status === "Rejected" && (
          <div className="flex gap-3 rounded-md border border-red-500/30 bg-red-500/10 p-4 text-red-900 dark:text-red-400">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                {t("cancellationRejected")}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm opacity-80">
                {ticket.latestCancellationRequest.reviewNote ?? t("noReason")}
              </p>
            </div>
          </div>
        )}

      {ticket.actions.isRequester && ticket.status === "Cancelled" && (
        <div className="flex gap-3 rounded-md border border-border bg-muted/50 p-4 text-muted-foreground">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {t("cancelled")}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm">
              {ticket.cancellationReason ?? "-"}
            </p>
            <p className="mt-1 text-xs">
              {t("cancelledBy", {
                name: ticket.cancelledByEmployeeName ?? t("assigneeFallback"),
                date: ticketDateTime(ticket.cancelledAt),
              })}
            </p>
          </div>
        </div>
      )}

      {ticket.actions.canRequestCancellation && (
        <div className="flex flex-wrap gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-500">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{t("cannotCancelTitle")}</p>
            <p className="mt-1 text-sm opacity-80">
              {t("cannotCancelBody", {
                department: ticket.targetDepartmentName ?? ticket.targetCompanyName,
              })}
            </p>
          </div>
          <Button variant="outline" onClick={() => setModal("cancelRequest")}>
            {t("requestCancellation")}
          </Button>
        </div>
      )}

      {ticket.status === "Rejected" && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">
            {t("rejectedBy", { name: ticket.rejectedByEmployeeName ?? "-" })}
          </p>
          <p className="mt-1">{ticket.rejectionReason}</p>
          <p className="mt-1 text-xs text-red-600">
            {ticketDateTime(ticket.rejectedAt)}
          </p>
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_450px]">
        <div className="space-y-6">
          <section>
            <h2 className="border-b border-border pb-2 text-sm font-semibold">
              {t("problemSection")}
            </h2>
            {/* ชื่อหมวด/หัวข้อเป็น snapshot ไทยจาก API — รอปรับ DTO ฝั่งผู้บริโภค (ดูแผน Phase 2) */}
            <dl className="divide-y divide-border/60">
              <InfoRow
                label={t("taxonomy")}
                value={
                  ticket.requestType === "External"
                    ? [
                        ticket.externalTicketCategoryName,
                        ticket.externalTicketTopicName,
                        ticket.externalTicketSubjectName,
                      ]
                        .filter(Boolean)
                        .join(" / ") || "-"
                    : [
                        ticket.categoryName ?? "-",
                        ticket.topicName ?? "-",
                        ticket.otherTopicText,
                      ]
                        .filter(Boolean)
                        .join(" / ")
                }
              />
              <InfoRow label={t("detailLabel")} value={ticket.detail} />
            </dl>
          </section>

          <div className="grid gap-6 sm:grid-cols-2">
            <section>
              <h2 className="border-b border-border pb-2 text-sm font-semibold">
                {t("requesterSection")}
              </h2>
              <dl className="divide-y divide-border/60">
                <InfoRow label={t("requester")}>
                  <div className="flex items-center gap-2">
                    <span>
                      {ticket.requester.nickname
                        ? `${ticket.requesterName} (${ticket.requester.nickname})`
                        : ticket.requesterName}
                    </span>
                    <Badge
                      variant={
                        ticket.requester.type === "External"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {ticket.requester.type === "External"
                        ? t("external")
                        : t("internal")}
                    </Badge>
                  </div>
                </InfoRow>
                <InfoRow
                  label={t("requesterCompany")}
                  value={ticket.sourceCompanyName}
                />
                <InfoRow
                  label={t("requesterDepartment")}
                  value={ticket.sourceDepartmentName}
                />
                <InfoRow label={t("contact")}>
                  {ticket.contactPhone || ticket.contactNote ? (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {ticket.contactPhone && (
                        // เบอร์ที่เก็บเป็น E.164 กดโทรออกได้ทันที ไม่ต้องเดารหัสประเทศเอง
                        <a
                          href={`tel:${ticket.contactPhone.replace(/[^\d+]/g, "")}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {formatPhone(ticket.contactPhone)}
                        </a>
                      )}
                      {ticket.contactPhone && ticket.contactNote && (
                        <span className="text-muted-foreground">·</span>
                      )}
                      {ticket.contactNote && <span>{ticket.contactNote}</span>}
                    </div>
                  ) : (
                    "-"
                  )}
                </InfoRow>
                <InfoRow
                  label={t("openedAt")}
                  value={ticketDateTime(ticket.createdAt)}
                />
              </dl>
            </section>

            <section>
              <h2 className="border-b border-border pb-2 text-sm font-semibold">
                {t("targetSection")}
              </h2>
              <dl className="divide-y divide-border/60">
                <InfoRow
                  label={t("targetCompany")}
                  value={ticket.targetCompanyName}
                />
                <InfoRow
                  label={t("targetDepartment")}
                  value={
                    ticket.targetDepartmentName ??
                    (ticket.requestType === "External"
                      ? t("noDepartment")
                      : "-")
                  }
                />
              </dl>
            </section>
            <section></section>
            <section>
              <h2 className="border-b border-border pb-2 text-sm font-semibold">
                {t("assignmentSection")}
              </h2>
              <dl className="divide-y divide-border/60">
                <InfoRow
                  label={t("acceptedBy")}
                  value={ticket.supervisorAcceptedByEmployeeName}
                />
                <InfoRow
                  label={t("acceptedAt")}
                  value={ticketDateTime(ticket.supervisorAcceptedAt)}
                />
                <InfoRow
                  label={t("assignee")}
                  value={ticket.currentAssignment?.assignedToEmployeeName}
                />
                <InfoRow
                  label={t("assignedBy")}
                  value={
                    ticket.currentAssignment
                      ? (ticket.currentAssignment.assignedByEmployeeName ??
                        (ticket.currentAssignment.assignmentSource ===
                        "SelfClaim"
                          ? t("selfClaim")
                          : t("autoAssigned")))
                      : undefined
                  }
                />
                <InfoRow
                  label={t("assignedAt")}
                  value={ticketDateTime(ticket.currentAssignment?.assignedAt)}
                />
                <InfoRow
                  label={t("assignmentNote")}
                  value={ticket.currentAssignment?.note}
                />
              </dl>
            </section>
          </div>

          <section>
            <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
              <h2 className="text-sm font-semibold">{t("createdEvidence")}</h2>
              <span className="text-xs text-muted-foreground">
                {t("fileCount", { count: createdAttachments.length })}
              </span>
            </div>
            <AttachmentList attachments={createdAttachments} />
          </section>

          {showCloseoutSummary && (
            <section>
              <h2 className="border-b border-border pb-2 text-sm font-semibold">
                {t("closeoutSection")}
              </h2>
              {/* closeoutReasonName เป็น snapshot ไทย — ไม่แปลย้อนหลังตามแผนข้อ 9 */}
              <div className="mt-3 space-y-4 text-sm">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("closeoutReason")}
                  </p>
                  {ticket.closeoutReasonName ? (
                    <p className="font-medium">{ticket.closeoutReasonName}</p>
                  ) : (
                    <p className="text-muted-foreground">
                      {t("noCloseoutReason")}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("resolutionNote")}
                  </p>
                  {ticket.resolutionNote ? (
                    <p className="whitespace-pre-wrap leading-6">
                      {ticket.resolutionNote}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      {t("noResolutionNote")}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("evidence")}
                    </p>
                    {resolvedAttachments.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {t("fileCount", { count: resolvedAttachments.length })}
                      </span>
                    )}
                  </div>
                  {resolvedAttachments.length > 0 ? (
                    <AttachmentList attachments={resolvedAttachments} />
                  ) : (
                    <p className="text-muted-foreground">{t("noEvidence")}</p>
                  )}
                </div>
                {(ticket.resolvedAt ||
                  ticket.verifiedAt ||
                  ticket.closedAt) && (
                  <div className="space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                    {ticket.resolvedAt && (
                      <p>
                        {t("resolvedBy", {
                          name: ticket.resolvedByEmployeeName ?? t("assigneeFallback"),
                          date: ticketDateTime(ticket.resolvedAt),
                        })}
                      </p>
                    )}
                    {ticket.verifiedAt && (
                      <p>
                        {t("verifiedBy", {
                          name: ticket.verifiedByEmployeeName ?? t("reviewerFallback"),
                          date: ticketDateTime(ticket.verifiedAt),
                        })}
                      </p>
                    )}
                    {ticket.closedAt && (
                      <p>
                        {t("closedBy", {
                          name: ticket.closedByEmployeeName ?? t("requesterFallback"),
                          date: ticketDateTime(ticket.closedAt),
                        })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <BoardRuntimePanel ticket={ticket} />

          <TeamPanel ticket={ticket} candidates={candidatesQuery.data ?? []} />

          {canViewAssignmentHistory && (
            <section>
              <h2 className="border-b border-border pb-2 text-sm font-semibold">
                {t("assignmentHistory")}
              </h2>
              {(historyQuery.data?.length ?? 0) === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">
                  {t("noAssignmentHistory")}
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {historyQuery.data?.map((item) => (
                    <div key={item.id} className="py-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">
                          {item.assignedToEmployeeName}
                        </p>
                        {item.isActive && (
                          <Badge variant="success">{t("current")}</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("historyBy", { name: item.assignedByEmployeeName ?? "-" })} ·{" "}
                        {ticketDateTime(item.assignedAt)}
                      </p>
                      {item.note && (
                        <p className="mt-1 text-muted-foreground">
                          {item.note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          <section>
            <h2 className="border-b border-border pb-2 text-sm font-semibold">
              {t("reviewHistory")}
            </h2>
            {(reviewsQuery.data?.length ?? 0) === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                {t("noReviewHistory")}
              </p>
            ) : (
              <div className="divide-y divide-border">
                {reviewsQuery.data?.map((review) => (
                  <div key={review.id} className="py-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">
                        {t("reviewRound", { round: review.reviewRound })}
                      </p>
                      <Badge
                        variant={
                          review.decision === "Approved" ? "success" : "warning"
                        }
                      >
                        {review.decision === "Approved"
                          ? t("reviewApproved")
                          : t("reviewReturned")}
                      </Badge>
                    </div>
                    {review.closeoutReasonSnapshot && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("reviewCloseoutReason", {
                          reason: review.closeoutReasonSnapshot,
                        })}
                      </p>
                    )}
                    {review.reviewNote && (
                      <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                        {review.reviewNote}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {review.reviewedByEmployeeName} ·{" "}
                      {ticketDateTime(review.reviewedAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
          
          <ConversationPanel ticket={ticket} />

        </div>
      </div>

      {modal === "assign" && (
        <AssignModal
          ticket={ticket}
          candidates={candidatesQuery.data ?? []}
          onClose={closeModal}
        />
      )}
      {modal === "triage" && <TriageModal ticket={ticket} onClose={closeModal} />}
      {modal === "reject" && <RejectModal ticket={ticket} onClose={closeModal} />}
      {modal === "return" && (
        <ReviewModal ticket={ticket} mode="return" onClose={closeModal} />
      )}
      {modal === "close" && (
        <ReviewModal ticket={ticket} mode="close" onClose={closeModal} />
      )}
      {modal === "completion" && (
        <CompletionModal ticket={ticket} onClose={closeModal} />
      )}
      {modal === "cancelRequest" && (
        <RequestCancellationModal ticket={ticket} onClose={closeModal} />
      )}
      {modal === "approveCancellation" && (
        <CancellationReviewModal
          ticket={ticket}
          decision="approve"
          onClose={closeModal}
        />
      )}
      {modal === "rejectCancellation" && (
        <CancellationReviewModal
          ticket={ticket}
          decision="reject"
          onClose={closeModal}
        />
      )}
      {modal === "events" && (
        <TicketEventsModal ticket={ticket} onClose={closeModal} />
      )}
    </div>
  );
}
