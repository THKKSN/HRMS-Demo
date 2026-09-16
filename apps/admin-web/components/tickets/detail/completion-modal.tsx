"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Send } from "lucide-react";
import { toast } from "sonner";
import type { TicketAttachmentDto, TicketDetailDto } from "@hrms/shared-types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import {
  useAddTicketAttachment,
  useDeleteTicketAttachment,
  useResolveTicket,
  useTicketCloseoutReasonOptions,
  useUpdateTicketWorkDetail,
} from "@/hooks/use-tickets";
import { uploadApi } from "@/lib/upload.api";
import { MAX_COMPLETION_FILES } from "./ticket-detail-shared";
import {
  PendingTicketFileItem,
  UploadedEvidenceItem,
} from "./ticket-attachments";
import { useApiError } from "@/hooks/use-api-error";

// เครื่องหมายบังคับ/ไม่บังคับ — โชว์หลังเลือกประเภทปัญหาแล้วเท่านั้น ก่อนหน้านั้นเห็นแค่หัวเรื่อง
function RequirementMark({
  show,
  required,
}: {
  show: boolean;
  required: boolean;
}) {
  const t = useTranslations("admin.ticket.completion");
  if (!show) return null;
  return required ? (
    <span className="text-destructive"> *</span>
  ) : (
    <span className="text-xs font-normal text-muted-foreground">
      {t("notRequiredForType")}
    </span>
  );
}

/** บันทึกจบงาน: เลือกประเภทปัญหา/เหตุผลปิดงานจาก master + รายละเอียด + ภาพหลักฐาน แล้วส่งตรวจ */
export function CompletionModal({
  ticket,
  onClose,
}: {
  ticket: TicketDetailDto;
  onClose: () => void;
}) {
  const t = useTranslations("admin.ticket.completion");
  const tCommon = useTranslations("common");
  const apiError = useApiError();
  const saveWork = useUpdateTicketWorkDetail(ticket.id);
  const resolveWork = useResolveTicket(ticket.id);
  const addAttachment = useAddTicketAttachment(ticket.id);
  const deleteAttachment = useDeleteTicketAttachment(ticket.id);
  // ตัวเลือกถูกกรองตามบริษัท/แผนกปลายทาง/หมวดของ ticket มาจาก backend แล้ว
  const optionsQuery = useTicketCloseoutReasonOptions(ticket.id);
  const closeoutOptions = optionsQuery.data ?? [];
  const [closeoutReasonId, setCloseoutReasonId] = useState(
    ticket.closeoutReasonId ?? "",
  );
  const [resolution, setResolution] = useState(ticket.resolutionNote ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | undefined>();
  const uploadedEvidence = ticket.attachments.filter(
    (item) => item.stage === "Resolved",
  );
  const totalImages = uploadedEvidence.length + files.length;
  const noReasonConfigured =
    !optionsQuery.isLoading && !optionsQuery.isError && closeoutOptions.length === 0;
  // ช่องไหนบังคับขึ้นกับเหตุผลที่เลือก — ยังไม่เลือกให้ถือว่าบังคับทั้งคู่ (ตรงกับ default ฝั่ง backend)
  const selectedOption = closeoutOptions.find(
    (option) => option.id === closeoutReasonId,
  );
  const hasSelectedReason = !!selectedOption;
  const requiresNote = selectedOption?.requiresResolutionNote ?? true;
  const requiresEvidence = selectedOption?.requiresCompletionEvidence ?? true;
  const busy =
    saveWork.isPending || resolveWork.isPending || uploading || !!deletingId;

  async function removeUploaded(attachment: TicketAttachmentDto) {
    if (!window.confirm(t("confirmDeleteImage"))) return;
    setDeletingId(attachment.id);
    try {
      await deleteAttachment.mutateAsync(attachment.id);
      toast.success(t("imageDeleted"));
    } catch (error) {
      toast.error(apiError(error, tCommon("state.error")));
    } finally {
      setDeletingId(undefined);
    }
  }

  async function submit() {
    if (!closeoutReasonId) return toast.error(t("reasonRequired"));
    if (requiresNote && !resolution.trim())
      return toast.error(t("noteRequired"));
    if (requiresEvidence && totalImages === 0)
      return toast.error(t("evidenceRequired"));
    if (totalImages > MAX_COMPLETION_FILES) {
      return toast.error(t("tooManyImages", { max: MAX_COMPLETION_FILES }));
    }

    try {
      const saved = await saveWork.mutateAsync({
        closeoutReasonId,
        resolutionNote: resolution.trim() || undefined,
        expectedUpdatedAt: ticket.updatedAt,
      });
      setUploading(true);
      for (const file of files) {
        const uploaded = await uploadApi.upload(file, "tickets");
        await addAttachment.mutateAsync({
          url: uploaded.url,
          fileName: uploaded.fileName,
          contentType: uploaded.contentType,
          sizeBytes: uploaded.sizeBytes,
          stage: "Resolved",
        });
        // ตัดไฟล์ที่ขึ้น server สำเร็จแล้วออกจาก state กันอัปโหลดซ้ำเมื่อกดส่งใหม่หลังเกิด error
        setFiles((current) => current.filter((item) => item !== file));
      }
      await resolveWork.mutateAsync(saved.updatedAt);
      toast.success(t("submitted"));
      onClose();
    } catch (error) {
      toast.error(apiError(error, tCommon("state.error")));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t("title", { ticketNo: ticket.ticketNo })}
      size="md"
    >
      <div className="space-y-5">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-900">
            {t("summaryTitle")}
          </p>
          <p className="mt-1 text-xs leading-5 text-emerald-800">
            {t("summaryHint")}
          </p>
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">
            {t("closeoutReason")} <span className="text-destructive">*</span>
          </span>
          <Select
            value={closeoutReasonId}
            disabled={optionsQuery.isLoading || noReasonConfigured}
            onChange={(event) => setCloseoutReasonId(event.target.value)}
          >
            <option value="">
              {optionsQuery.isLoading ? tCommon("state.loading") : t("selectReason")}
            </option>
            {closeoutOptions.map((option) => (
              <option
                key={option.id}
                value={option.id}
                disabled={
                  option.isLegacySelection && option.id !== closeoutReasonId
                }
              >
                {/* ตัวเลือกยังไม่มี nameEn/nameId ใน DTO นี้ — ใช้ชื่อไทยไปก่อน (ช่องว่างใน Phase 2) */}
                {option.name}
                {option.isLegacySelection ? t("legacy") : ""}
              </option>
            ))}
          </Select>
          {noReasonConfigured && (
            <p className="text-xs text-destructive">{t("noReasonConfigured")}</p>
          )}
          {!hasSelectedReason && !noReasonConfigured && !optionsQuery.isLoading && (
            <p className="text-xs text-muted-foreground">{t("selectHint")}</p>
          )}
          {optionsQuery.isError && (
            <p className="text-xs text-destructive">{t("loadFailed")}</p>
          )}
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">
            {t("resolutionNote")}
            <RequirementMark show={hasSelectedReason} required={requiresNote} />
          </span>
          <textarea
            rows={6}
            maxLength={2000}
            value={resolution}
            onChange={(event) => setResolution(event.target.value)}
            placeholder={t("resolutionPlaceholder")}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <Label>
              {t("evidence")}
              <RequirementMark
                show={hasSelectedReason}
                required={requiresEvidence}
              />
            </Label>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                totalImages > MAX_COMPLETION_FILES
                  ? "bg-destructive/10 text-destructive"
                  : totalImages > 0
                    ? "bg-primary/10 text-primary"
                    : "bg-slate-100 text-slate-500"
              }`}
            >
              {t("imageCount", { count: totalImages, max: MAX_COMPLETION_FILES })}
            </span>
          </div>
          {uploadedEvidence.length > 0 && (
            <div className="space-y-2 rounded-md border border-border bg-muted/30 p-2">
              <p className="px-1 pt-1 text-xs text-muted-foreground">
                {t("uploadedHint")}
              </p>
              {uploadedEvidence.map((item) => (
                <UploadedEvidenceItem
                  key={item.id}
                  attachment={item}
                  disabled={busy}
                  deleting={deletingId === item.id}
                  onDelete={() => removeUploaded(item)}
                />
              ))}
            </div>
          )}
          <label
            className={`flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 text-center hover:border-primary hover:bg-primary/5 ${
              totalImages > 0
                ? "border-primary bg-primary/5"
                : "border-slate-300 bg-slate-50"
            }`}
          >
            <ImagePlus className="h-5 w-5 text-primary" />
            <span className="mt-2 text-sm font-medium">
              {totalImages > 0 ? t("addImage") : t("selectImage")}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              {totalImages > 0 ? t("haveImages", { count: totalImages }) : t("formats")}
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={busy || totalImages >= MAX_COMPLETION_FILES}
              className="hidden"
              onChange={(event) => {
                const selectedFiles = Array.from(
                  event.currentTarget.files ?? [],
                );
                event.currentTarget.value = "";
                setFiles((current) =>
                  [...current, ...selectedFiles].slice(
                    0,
                    Math.max(0, MAX_COMPLETION_FILES - uploadedEvidence.length),
                  ),
                );
              }}
            />
          </label>
          {files.length > 0 && (
            <div className="space-y-2 rounded-md border border-border bg-muted/30 p-2">
              {files.map((file, index) => (
                <PendingTicketFileItem
                  key={`${file.name}-${file.lastModified}-${index}`}
                  file={file}
                  disabled={busy}
                  onRemove={() =>
                    setFiles((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            {tCommon("action.cancel")}
          </Button>
          <Button
            loading={busy}
            disabled={busy || noReasonConfigured}
            onClick={submit}
          >
            <Send className="h-4 w-4" /> {t("submit")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
