"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  ImagePlus,
  ListTodo,
  Loader2,
  Pencil,
  Pin,
  PinOff,
  PlusIcon,
  RefreshCcw,
  Route,
  TimerReset,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import type {
  TicketAttachmentDto,
  TicketDetailDto,
  TicketProgressEntryDto,
} from "@hrms/shared-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import {
  useAddTicketAttachment,
  useDeleteTicketAttachment,
  usePinTicketProgressEntry,
  useRefreshTicketDetail,
  useUpdateTicketProgress,
  useUpdateTicketProgressEntry,
} from "@/hooks/use-tickets";
import { uploadApi } from "@/lib/upload.api";
import { getTicketProgressFeedStyle } from "@/lib/ticket-progress-feed";
import {
  ACTIVITY_CARD_PREVIEW_COUNT,
  MAX_ACTIVITY_FILES,
  ticketDateTime,
} from "./ticket-detail-shared";
import {
  AttachmentList,
  PendingTicketFileItem,
  UploadedEvidenceItem,
} from "./ticket-attachments";
import Loadable from "next/dist/shared/lib/loadable.shared-runtime";
import { useApiError } from "@/hooks/use-api-error";

type ProgressCardLane = "workState" | "blockerReason" | "nextAction";

// การ์ดหนึ่งใบมีหัวข้อได้ lane เดียว — ลำดับความสำคัญเดียวกับ getTicketProgressFeedStyle
function progressEntryLane(
  entry: Pick<
    TicketProgressEntryDto,
    "workState" | "blockerReason" | "nextAction"
  >,
): ProgressCardLane {
  if (entry.workState?.trim()) return "workState";
  if (entry.blockerReason?.trim()) return "blockerReason";
  if (entry.nextAction?.trim()) return "nextAction";
  return "workState";
}

/** บอร์ดกิจกรรมระหว่างดำเนินงาน: รายการการ์ด (ปักหมุด/แก้ไข) + composer เพิ่ม/แก้ไขการ์ด */
export function BoardRuntimePanel({ ticket }: { ticket: TicketDetailDto }) {
  const t = useTranslations("admin.ticket.runtime");
  const tCommon = useTranslations("common");
  const apiError = useApiError();
  const updateProgress = useUpdateTicketProgress(ticket.id);
  const updateProgressEntry = useUpdateTicketProgressEntry(ticket.id);
  const pinProgressEntry = usePinTicketProgressEntry(ticket.id);
  const refreshBoard = useRefreshTicketDetail(ticket.id);
  const addAttachment = useAddTicketAttachment(ticket.id);
  const deleteAttachment = useDeleteTicketAttachment(ticket.id);
  const pinningEntryId = pinProgressEntry.isPending
    ? pinProgressEntry.variables?.entryId
    : undefined;
  const canComposeProgress =
    ticket.actions.canEditWorkDetail ||
    ticket.actions.canRequestInfo ||
    ticket.actions.canResume ||
    ticket.actions.canResolve;
  const canAttachActivityFiles = ticket.actions.canAddAttachment;
  const [cardLane, setCardLane] = useState<ProgressCardLane>("workState");
  const [cardTitleDraft, setCardTitleDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  // ผู้ดูแลการ์ด (งานย่อย) — ว่าง = ยกให้คนที่กดบันทึกเอง เหมือนพฤติกรรมเดิม
  const [ownerDraft, setOwnerDraft] = useState("");
  const [activityFiles, setActivityFiles] = useState<File[]>([]);
  const [uploadingActivityFiles, setUploadingActivityFiles] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string>();
  const [isCardComposerOpen, setIsCardComposerOpen] = useState(false);
  // เก็บแค่ id แล้ว derive จาก ticket เพื่อให้รายการรูปของการ์ดอัปเดตตาม query หลังลบ/เพิ่ม
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [showAllProgressFeed, setShowAllProgressFeed] = useState(false);
  const editingEntry = editingEntryId
    ? (ticket.progressEntries.find((entry) => entry.id === editingEntryId) ??
      null)
    : null;
  const isEditing = editingEntry !== null;
  const existingActivityFiles = editingEntry?.attachments ?? [];
  const totalActivityFiles =
    existingActivityFiles.length + activityFiles.length;
  const remainingActivityFileSlots = Math.max(
    0,
    MAX_ACTIVITY_FILES - existingActivityFiles.length,
  );
  const savingProgress =
    updateProgress.isPending ||
    updateProgressEntry.isPending ||
    uploadingActivityFiles ||
    addAttachment.isPending ||
    !!deletingAttachmentId;

  useEffect(() => {
    setCardTitleDraft("");
    setNoteDraft("");
    setActivityFiles([]);
  }, [ticket.updatedAt]);

  const currentStepLabel = useMemo(() => {
    const source =
      ticket.workflowBoardSteps.length > 0
        ? ticket.workflowBoardSteps
        : ticket.workflowSteps;
    return source.find((step) => step.key === ticket.workflowCurrentStepKey)
      ?.label;
  }, [
    ticket.workflowBoardSteps,
    ticket.workflowCurrentStepKey,
    ticket.workflowSteps,
  ]);

  const presetGroups = useMemo(
    () => ({
      workState: ticket.workflowInProgressPresets.filter(
        (item) => item.isActive && item.kind === "work_state",
      ),
      blockerReason: ticket.workflowInProgressPresets.filter(
        (item) => item.isActive && item.kind === "blocker_reason",
      ),
      nextAction: ticket.workflowInProgressPresets.filter(
        (item) => item.isActive && item.kind === "next_action",
      ),
    }),
    [ticket.workflowInProgressPresets],
  );

  // preset ของ workflow เป็นข้อความที่ HR ตั้งเอง — ไม่แปล
  const laneComposerMeta = {
    workState: {
      label: t("composer.workState.label"),
      placeholder: t("composer.workState.placeholder"),
      presets: presetGroups.workState,
    },
    blockerReason: {
      label: t("composer.blockerReason.label"),
      placeholder: t("composer.blockerReason.placeholder"),
      presets: presetGroups.blockerReason,
    },
    nextAction: {
      label: t("composer.nextAction.label"),
      placeholder: t("composer.nextAction.placeholder"),
      presets: presetGroups.nextAction,
    },
  } as const;

  const progressFeed = useMemo(
    () =>
      ticket.progressEntries.map((entry) => {
        const style = getTicketProgressFeedStyle(entry);
        const Icon =
          style.lane === "closed"
            ? CheckCircle2
            : style.lane === "process"
              ? TimerReset
              : style.lane === "hold"
                ? TriangleAlert
                : style.lane === "waiting"
                  ? Route
                  : ListTodo;

        return { ...entry, ...style, Icon };
      }),
    [ticket.progressEntries],
  );
  const hiddenProgressFeedCount = Math.max(
    progressFeed.length - ACTIVITY_CARD_PREVIEW_COUNT,
    0,
  );
  const visibleProgressFeed = showAllProgressFeed
    ? progressFeed
    : progressFeed.slice(0, ACTIVITY_CARD_PREVIEW_COUNT);
  // backend เรียงการ์ดที่ปักหมุดขึ้นก่อน ตัวแรกของ list จึงไม่ใช่การ์ดล่าสุดเสมอไป — หา latest จากเวลาสร้างแทน
  const latestEntryId = useMemo(
    () =>
      ticket.progressEntries.reduce<TicketProgressEntryDto | undefined>(
        (latest, entry) =>
          !latest || entry.createdAt > latest.createdAt ? entry : latest,
        undefined,
      )?.id,
    [ticket.progressEntries],
  );

  const laneOptions: Array<{
    key: ProgressCardLane;
    label: string;
    className: string;
  }> = [
    {
      key: "workState",
      label: t("lane.workState"),
      className: "border-sky-600 bg-sky-600 text-white shadow-sm",
    },
    {
      key: "blockerReason",
      label: t("lane.blockerReason"),
      className: "border-amber-500 bg-amber-500 text-white shadow-sm",
    },
    // การ์ด "งานถัดไป" ระบบเป็นคนสร้าง — โชว์ตัวเลือกนี้เฉพาะตอนแก้ไขการ์ดที่อยู่ lane นี้อยู่แล้ว
    ...(editingEntry && progressEntryLane(editingEntry) === "nextAction"
      ? [
          {
            key: "nextAction" as const,
            label: t("lane.nextAction"),
            className: "border-violet-500 bg-violet-500 text-white shadow-sm",
          },
        ]
      : []),
  ];

  function addActivityFiles(files: File[]) {
    if (files.length === 0) return;
    setActivityFiles((current) =>
      [...current, ...files].slice(0, remainingActivityFileSlots),
    );
  }

  function resetComposerDraft() {
    setCardLane("workState");
    setCardTitleDraft("");
    setNoteDraft("");
    setOwnerDraft("");
    setActivityFiles([]);
    setEditingEntryId(null);
  }

  function clearActivityDraft() {
    resetComposerDraft();
    setIsCardComposerOpen(false);
  }

  function openCardCreator() {
    // ร่างที่ค้างอยู่ของโหมดเพิ่มยังเก็บไว้ (พฤติกรรมเดิม) — ล้างเฉพาะเมื่อค้างมาจากโหมดแก้ไข
    if (editingEntryId) resetComposerDraft();
    setIsCardComposerOpen(true);
  }

  function openCardEditor(entry: TicketProgressEntryDto) {
    const lane = progressEntryLane(entry);
    setEditingEntryId(entry.id);
    setCardLane(lane);
    setCardTitleDraft(entry[lane] ?? "");
    setNoteDraft(entry.note ?? "");
    setOwnerDraft(entry.ownerEmployeeId ?? "");
    setActivityFiles([]);
    setIsCardComposerOpen(true);
  }

  async function removeExistingActivityFile(attachment: TicketAttachmentDto) {
    if (!window.confirm(t("confirmDeleteImage"))) return;
    setDeletingAttachmentId(attachment.id);
    try {
      await deleteAttachment.mutateAsync(attachment.id);
      toast.success(t("imageDeleted"));
    } catch (error) {
      toast.error(apiError(error, tCommon("state.error")));
    } finally {
      setDeletingAttachmentId(undefined);
    }
  }

  async function reloadBoard() {
    try {
      await refreshBoard.mutateAsync();
    } catch (error) {
      toast.error(apiError(error, tCommon("state.error")));
    }
  }

  async function togglePin(entry: TicketProgressEntryDto) {
    const isPinned = !entry.pinnedAt;
    try {
      await pinProgressEntry.mutateAsync({
        entryId: entry.id,
        isPinned,
        expectedUpdatedAt: ticket.updatedAt,
      });
      toast.success(isPinned ? t("pinned") : t("unpinned"));
    } catch (error) {
      toast.error(apiError(error, tCommon("state.error")));
    }
  }

  async function saveProgress() {
    const title = cardTitleDraft.trim();
    if (!title) {
      toast.error(t("titleRequired"));
      return;
    }

    const payload = {
      workState: cardLane === "workState" ? title : undefined,
      blockerReason: cardLane === "blockerReason" ? title : undefined,
      nextAction: cardLane === "nextAction" ? title : undefined,
      note: noteDraft.trim() || undefined,
      expectedUpdatedAt: ticket.updatedAt,
      ownerEmployeeId: ownerDraft || undefined,
    };
    const editing = editingEntry;
    const savedLabel = editing ? t("edited") : t("added");

    try {
      const filesToUpload = activityFiles;
      const result = editing
        ? await updateProgressEntry.mutateAsync({
            entryId: editing.id,
            ...payload,
          })
        : await updateProgress.mutateAsync(payload);
      const progressEntryId = editing?.id ?? result.progressEntryId;
      if (filesToUpload.length > 0) {
        if (!progressEntryId) {
          toast.error(t("savedButNoLink", { saved: savedLabel }));
          clearActivityDraft();
          return;
        }

        setUploadingActivityFiles(true);
        try {
          for (const file of filesToUpload) {
            const uploaded = await uploadApi.upload(file, "tickets");
            await addAttachment.mutateAsync({
              url: uploaded.url,
              fileName: uploaded.fileName,
              contentType: uploaded.contentType,
              sizeBytes: uploaded.sizeBytes,
              stage: "Progress",
              ticketProgressEntryId: progressEntryId,
            });
          }
          toast.success(editing ? t("editedWithImages") : t("addedWithImages"));
        } catch (error) {
          toast.error(t("savedButAttachFailed", {
            saved: savedLabel,
            error: apiError(error, tCommon("state.error")),
          }));
        } finally {
          setUploadingActivityFiles(false);
        }
      } else {
        toast.success(savedLabel);
      }
      clearActivityDraft();
    } catch (error) {
      toast.error(apiError(error, tCommon("state.error")));
    }
  }

  return (
    <section>
      {currentStepLabel && <Badge variant="info">{currentStepLabel}</Badge>}

      <div className="rounded-md border border-border bg-background p-4 mb-3">
        <div className="flex justify-between gap-2">
          <div className="flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">{t("title")}</h3>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="icon"
              title={t("reload")}
              aria-label={t("reload")}
              disabled={refreshBoard.isPending}
              onClick={reloadBoard}
            >
              {refreshBoard.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        {canComposeProgress && (
          <div className="mt-2">
            <Button className="w-full" onClick={openCardCreator}>
              <PlusIcon className="h-4 w-4" /> {t("addEntry")}
            </Button>
          </div>
        )}
        <div className="mt-4 space-y-3">
          {progressFeed.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <>
              {visibleProgressFeed.map((entry) => {
                const Icon = entry.Icon;
                const isPinned = !!entry.pinnedAt;
                const isPinning = pinningEntryId === entry.id;
                return (
                  <article
                    key={entry.id}
                    data-progress-lane={entry.lane}
                    data-pinned={isPinned || undefined}
                    className={`group rounded-lg border p-4 ${entry.surfaceClass} ${isPinned ? "ring-1 ring-amber-300/70" : ""}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 rounded-full border p-2 ${entry.iconClass}`}
                        >
                          <Icon className="h-4 w-4 text-current" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              {entry.title}
                            </p>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${entry.badgeClass}`}
                            >
                              {entry.laneLabel}
                            </span>
                            {isPinned && (
                              <Badge variant="warning">
                                <Pin className="mr-1 h-3 w-3" /> Pin
                              </Badge>
                            )}
                            {entry.id === latestEntryId && (
                              <Badge variant="secondary">latest</Badge>
                            )}
                            {entry.canPin && (
                              <button
                                type="button"
                                title={isPinned ? "Un pin" : "Pined"}
                                aria-label={isPinned ? "Un pin" : "Pined"}
                                aria-pressed={isPinned}
                                disabled={isPinning}
                                onClick={() => togglePin(entry)}
                                // การ์ดที่ปักอยู่โชว์ปุ่มตลอดเพื่อให้เลิกปักได้ทันที ส่วนการ์ดปกติซ่อนไว้จน hover (จอ md ขึ้นไป)
                                className={`flex h-7 w-7 items-center justify-center rounded-md border transition-opacity focus-visible:opacity-100 disabled:opacity-50 ${
                                  isPinned
                                    ? "border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400"
                                    : "border-border/70 text-muted-foreground hover:border-primary hover:text-primary md:opacity-0 md:group-hover:opacity-100"
                                }`}
                              >
                                {isPinning ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : isPinned ? (
                                  <PinOff className="h-3.5 w-3.5" />
                                ) : (
                                  <Pin className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                            {entry.canEdit && (
                              <button
                                type="button"
                                title={t("editCard")}
                                aria-label={t("editCard")}
                                onClick={() => openCardEditor(entry)}
                                // จอเล็กไม่มี hover เลยโชว์ตลอด — จอ md ขึ้นไปซ่อนไว้จนกว่าจะ hover การ์ดหรือ focus ด้วยคีย์บอร์ด
                                className="flex h-7 w-7 items-center justify-center rounded-md border border-border/70 text-muted-foreground transition-opacity hover:border-primary hover:text-primary focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t("by", { name: entry.createdByEmployeeName })} •{" "}
                            {ticketDateTime(entry.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {entry.ownerEmployeeName && (
                          <Badge variant="outline">
                            {entry.ownerEmployeeName}
                          </Badge>
                        )}
                        {entry.dueAt && (
                          <Badge variant="secondary">
                            {t("dueAt", { date: ticketDateTime(entry.dueAt) })}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {entry.note && (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-5 text-foreground">
                        {entry.note}
                      </p>
                    )}
                    {!!entry.attachments?.length && (
                      <div className="mt-3 border-t border-border/70 pt-3">
                        <AttachmentList attachments={entry.attachments} />
                      </div>
                    )}
                  </article>
                );
              })}
              {hiddenProgressFeedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllProgressFeed((value) => !value)}
                  className="flex h-10 w-full items-center justify-center rounded-md bg-background text-sm font-medium text-gray-300 transition-colors hover:text-gray-500 cursor:pointer"
                >
                  {showAllProgressFeed
                    ? "Show less"
                    : `Show ${hiddenProgressFeedCount} more`}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {(canComposeProgress || isEditing) && isCardComposerOpen && (
        <Modal
          open={isCardComposerOpen}
          onClose={() => setIsCardComposerOpen(false)}
          title={isEditing ? t("editTitle") : t("addTitle")}
          size="lg"
        >
          <section className="space-y-6">
            {editingEntry && (
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <Pencil className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {t("editingOf", { name: editingEntry.createdByEmployeeName })} •{" "}
                  {ticketDateTime(editingEntry.createdAt)}
                </span>
              </div>
            )}

            <div
              className={`grid gap-3 ${laneOptions.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}
            >
              {laneOptions.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setCardLane(item.key)}
                  className={`min-h-15 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${
                    cardLane === item.key
                      ? item.className
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span className="block text-[11px] font-medium opacity-75">
                    {t("entryType")}
                  </span>
                  <span className="mt-1 block">{item.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label>{t("cardTitle")}</Label>
                <Input
                  value={cardTitleDraft}
                  maxLength={200}
                  onChange={(event) => setCardTitleDraft(event.target.value)}
                  placeholder={laneComposerMeta[cardLane].placeholder}
                />
                <div className="flex flex-wrap gap-2">
                  {laneComposerMeta[cardLane].presets
                    .slice(0, 8)
                    .map((preset) => (
                      <button
                        key={preset.key}
                        type="button"
                        className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                        onClick={() => setCardTitleDraft(preset.label)}
                      >
                        {preset.label}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {ticket.teamMembers.length > 1 && (
              <div className="mt-4 space-y-2">
                <Label htmlFor="card-owner">{t("owner")}</Label>
                <Select
                  id="card-owner"
                  value={ownerDraft}
                  onChange={(event) => setOwnerDraft(event.target.value)}
                >
                  <option value="">{t("ownerSelf")}</option>
                  {ticket.teamMembers.map((member) => (
                    <option key={member.employeeId} value={member.employeeId}>
                      {member.employeeName}
                      {member.memberRole === "Owner" ? t("ownerIsMain") : ""}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground">{t("ownerHint")}</p>
              </div>
            )}

            <div className="mt-4 space-y-2">
              <Label>{t("note")}</Label>
              <Textarea
                rows={3}
                maxLength={2000}
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder={t("notePlaceholder")}
              />
            </div>
            {canAttachActivityFiles && (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <Label>{t("images")}</Label>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      totalActivityFiles > 0
                        ? "bg-primary/10 text-primary"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {t("imageCount", { count: totalActivityFiles, max: MAX_ACTIVITY_FILES })}
                  </span>
                </div>
                {existingActivityFiles.length > 0 && (
                  <div className="space-y-2 rounded-md border border-border bg-muted/30 p-2">
                    <p className="px-1 pt-1 text-xs text-muted-foreground">
                      {t("existingImagesHint")}
                    </p>
                    {existingActivityFiles.map((item) => (
                      <UploadedEvidenceItem
                        key={item.id}
                        attachment={item}
                        disabled={savingProgress}
                        deleting={deletingAttachmentId === item.id}
                        onDelete={() => removeExistingActivityFile(item)}
                      />
                    ))}
                  </div>
                )}
                <label
                  className={`flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-4 text-center hover:border-primary hover:bg-primary/5 ${
                    totalActivityFiles > 0
                      ? "border-primary bg-primary/5"
                      : "border-slate-300 bg-slate-50"
                  }`}
                >
                  <ImagePlus className="h-5 w-5 text-primary" />
                  <span className="mt-2 text-sm font-medium">
                    {totalActivityFiles > 0 ? t("addImage") : t("selectImage")}
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">
                    {activityFiles.length > 0
                      ? t("newlySelected", { count: activityFiles.length })
                      : t("formats")}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={
                      savingProgress || totalActivityFiles >= MAX_ACTIVITY_FILES
                    }
                    className="hidden"
                    onChange={(event) => {
                      const selectedFiles = Array.from(
                        event.currentTarget.files ?? [],
                      );
                      event.currentTarget.value = "";
                      addActivityFiles(selectedFiles);
                    }}
                  />
                </label>
                {activityFiles.length > 0 && (
                  <div className="space-y-2 rounded-md border border-border bg-muted/30 p-2">
                    {activityFiles.map((file, index) => (
                      <PendingTicketFileItem
                        key={`${file.name}-${file.lastModified}-${index}`}
                        file={file}
                        disabled={savingProgress}
                        onRemove={() =>
                          setActivityFiles((current) =>
                            current.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          )
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            {!canAttachActivityFiles && (
              <div className="flex items-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-muted-foreground">
                <ImagePlus className="h-4 w-4 shrink-0" />
                <span>{t("noAttachPermission")}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={savingProgress}
                onClick={() => setIsCardComposerOpen(false)}
              >
                {tCommon("action.cancel")}
              </Button>
              <Button
                type="button"
                onClick={saveProgress}
                loading={savingProgress}
                disabled={savingProgress}
              >
                {isEditing ? t("saveEdit") : t("saveCard")}
              </Button>
            </div>
          </section>
        </Modal>
      )}
    </section>
  );
}
