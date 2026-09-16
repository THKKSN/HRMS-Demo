"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, FileText, Loader2, Trash2 } from "lucide-react";
import type { TicketAttachmentDto } from "@hrms/shared-types";
import { Modal } from "@/components/ui/modal";
import { useProtectedFileUrl } from "@/hooks/use-protected-file-url";

// component เกี่ยวกับไฟล์แนบของ ticket: รายการไฟล์ที่เลือกแล้วยังไม่อัปโหลด, พรีวิวรูป, กริดไฟล์แนบ, และรายการไฟล์ที่อัปโหลดแล้ว

export function PendingTicketFileItem({
  file,
  disabled,
  onRemove,
}: {
  file: File;
  disabled: boolean;
  onRemove: () => void;
}) {
  const t = useTranslations("admin.ticket.attachment");
  const previewUrl = useMemo(
    () =>
      file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    [file],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-white p-2.5 shadow-sm">
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={file.name}
          className="h-14 w-14 shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{file.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {(file.size / 1024).toFixed(0)} KB
        </p>
      </div>
      <button
        type="button"
        title={t("removeImage")}
        disabled={disabled}
        onClick={onRemove}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-destructive hover:bg-destructive/10 disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function isImageAttachment(attachment: TicketAttachmentDto) {
  return (
    attachment.contentType?.startsWith("image/") ||
    /\.(?:jpe?g|png|webp|gif)(?:[?#].*)?$/i.test(attachment.url)
  );
}

export function TicketImagePreviewModal({
  url,
  fileName,
  onClose,
}: {
  url: string;
  fileName: string;
  onClose: () => void;
}) {
  return (
    <Modal open onClose={onClose} title={fileName} size="xl">
      <div className="space-y-3">
        <div className="overflow-hidden rounded-md border border-border bg-muted">
          <img
            src={url}
            alt={fileName}
            className="max-h-[72dvh] w-full object-contain"
          />
        </div>
      </div>
    </Modal>
  );
}

export function AttachmentLink({
  attachment,
  fileName,
  list = false,
}: {
  attachment: TicketAttachmentDto;
  fileName: string;
  list?: boolean;
}) {
  const url = useProtectedFileUrl(attachment.url);
  const [previewOpen, setPreviewOpen] = useState(false);
  if (!url) return <div className="h-24 animate-pulse rounded-md bg-muted" />;
  if (!isImageAttachment(attachment)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 px-3 py-3 text-sm hover:text-primary"
      >
        <FileText className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{fileName}</span>
        <ExternalLink className="h-4 w-4 shrink-0" />
      </a>
    );
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className="group block w-full min-w-0 text-left"
      >
        <div className="aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={url}
            alt={fileName}
            loading="lazy"
            className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
          />
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-2 text-xs ${list ? "" : "border-t border-border"}`}
        >
          <span className="min-w-0 flex-1 truncate">{fileName}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </div>
      </button>
      {previewOpen && (
        <TicketImagePreviewModal
          url={url}
          fileName={fileName}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </>
  );
}

export function AttachmentList({
  attachments,
}: {
  attachments: TicketAttachmentDto[];
}) {
  const t = useTranslations("admin.ticket.attachment");
  if (attachments.length === 0) {
    return <p className="py-6 text-sm text-muted-foreground">{t("none")}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 py-3 sm:grid-cols-3 lg:grid-cols-2">
      {attachments.map((attachment, index) => {
        const fileName = attachment.fileName || t("fallbackName", { n: index + 1 });
        return (
          <div
            key={attachment.id}
            className={`${isImageAttachment(attachment) ? "" : "col-span-full"} overflow-hidden rounded-md border border-border bg-background`}
          >
            <AttachmentLink attachment={attachment} fileName={fileName} list />
          </div>
        );
      })}
    </div>
  );
}

export function UploadedEvidenceItem({
  attachment,
  disabled,
  deleting,
  onDelete,
}: {
  attachment: TicketAttachmentDto;
  disabled: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  const t = useTranslations("admin.ticket.attachment");
  const url = useProtectedFileUrl(attachment.url);
  const isImage = isImageAttachment(attachment);

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-white p-2.5 shadow-sm">
      {isImage && url ? (
        <img
          src={url}
          alt={attachment.fileName}
          className="h-14 w-14 shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{attachment.fileName}</p>
        <p className="mt-0.5 text-xs text-emerald-600">{t("uploaded")}</p>
      </div>
      <button
        type="button"
        title={t("deleteUploaded")}
        disabled={disabled}
        onClick={onDelete}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-destructive disabled:opacity-50"
      >
        {deleting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
