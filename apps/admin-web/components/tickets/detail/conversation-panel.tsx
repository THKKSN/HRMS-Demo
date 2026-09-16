"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { LockKeyhole, MessageSquare, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import type { TicketDetailDto } from "@hrms/shared-types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import {
  useAddTicketComment,
  useRequestTicketInfo,
  useTicketComments,
} from "@/hooks/use-tickets";
import { ticketDateTime } from "./ticket-detail-shared";
import { useApiError } from "@/hooks/use-api-error";

/** การสนทนา: ข้อความถึงผู้แจ้ง / บันทึกภายใน + ขอข้อมูลเพิ่ม */
export function ConversationPanel({ ticket }: { ticket: TicketDetailDto }) {
  const t = useTranslations("admin.ticket.conversation");
  const tCommon = useTranslations("common");
  const apiError = useApiError();
  const commentsQuery = useTicketComments(ticket.id);
  const addComment = useAddTicketComment(ticket.id);
  const requestInfo = useRequestTicketInfo(ticket.id);
  const [mode, setMode] = useState<"public" | "internal">("public");
  const [message, setMessage] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [requestInfoOpen, setRequestInfoOpen] = useState(false);
  const comments = (commentsQuery.data ?? []).filter((comment) =>
    mode === "internal" ? comment.isInternal : !comment.isInternal,
  );

  useEffect(() => {
    if (!ticket.actions.canAddInternalNote && mode === "internal")
      setMode("public");
  }, [mode, ticket.actions.canAddInternalNote]);

  async function sendComment() {
    if (!message.trim()) return;
    try {
      await addComment.mutateAsync({
        message: message.trim(),
        commentType: "General",
        isInternal: mode === "internal",
      });
      setMessage("");
      toast.success(mode === "internal" ? t("internalAdded") : t("publicSent"));
    } catch (error) {
      toast.error(apiError(error, tCommon("state.error")));
    }
  }

  async function sendInfoRequest() {
    if (!requestMessage.trim()) return toast.error(t("requestInfoRequired"));
    try {
      await requestInfo.mutateAsync({
        message: requestMessage.trim(),
        expectedUpdatedAt: ticket.updatedAt,
      });
      setRequestMessage("");
      setRequestInfoOpen(false);
      setMode("public");
      toast.success(t("requestInfoSent"));
    } catch (error) {
      toast.error(apiError(error, tCommon("state.error")));
    }
  }

  const canCompose =
    mode === "internal"
      ? ticket.actions.canAddInternalNote
      : ticket.actions.canComment;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
        <h2 className="text-sm font-semibold">{t("title")}</h2>
        {ticket.actions.canRequestInfo && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRequestInfoOpen(true)}
          >
            <MessageSquare className="h-4 w-4" /> {t("requestInfo")}
          </Button>
        )}
      </div>

      <div className="mt-3 flex border-b border-border">
        <button
          type="button"
          onClick={() => setMode("public")}
          className={`border-b-2 px-3 py-2 text-xs font-medium ${
            mode === "public"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground"
          }`}
        >
          {t("tabPublic")}
        </button>
        {ticket.actions.canAddInternalNote && (
          <button
            type="button"
            onClick={() => setMode("internal")}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium ${
              mode === "internal"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground"
            }`}
          >
            <LockKeyhole className="h-3.5 w-3.5" /> {t("tabInternal")}
          </button>
        )}
      </div>

      {mode === "internal" && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {t("internalNotice")}
        </div>
      )}

      <div className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
        {commentsQuery.isLoading &&
          Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded-md bg-muted"
            />
          ))}
        {commentsQuery.isError && (
          <div className="py-6 text-center text-sm text-destructive">
            <p>{t("loadFailed")}</p>
            <Button
              className="mt-2"
              size="sm"
              variant="outline"
              onClick={() => commentsQuery.refetch()}
            >
              <RefreshCw className="h-4 w-4" /> {tCommon("action.retryShort")}
            </Button>
          </div>
        )}
        {!commentsQuery.isLoading &&
          !commentsQuery.isError &&
          comments.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {mode === "internal" ? t("emptyInternal") : t("empty")}
            </p>
          )}
        {comments.map((comment) => (
          <article
            key={comment.id}
            className={`rounded-md border px-3 py-2.5 text-sm ${
              comment.isInternal
                ? "border-amber-200 bg-amber-50/70"
                : comment.commentType === "RequestInfo"
                  ? "border-orange-200 bg-orange-50"
                  : "border-border bg-muted/30"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{comment.employeeName}</p>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {ticketDateTime(comment.createdAt)}
              </span>
            </div>
            <p className="mt-1.5 whitespace-pre-wrap leading-5">
              {comment.message}
            </p>
            {comment.commentType === "RequestInfo" && (
              <p className="mt-2 text-xs font-medium text-orange-700">
                {t("requestInfoTag")}
              </p>
            )}
          </article>
        ))}
      </div>

      {canCompose ? (
        <div className="mt-3 space-y-2">
          <textarea
            rows={3}
            maxLength={2000}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={mode === "internal" ? t("placeholderInternal") : t("placeholderPublic")}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {message.length}/2000
            </span>
            <Button
              size="sm"
              loading={addComment.isPending}
              disabled={!message.trim()}
              onClick={sendComment}
            >
              <Send className="h-4 w-4" />
              {mode === "internal" ? t("sendInternal") : t("sendPublic")}
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
          {t("closedNotice")}
        </p>
      )}

      {requestInfoOpen && (
        <Modal
          open
          onClose={() => setRequestInfoOpen(false)}
          title={t("requestInfoTitle")}
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("requestInfoHint")}</p>
            <div className="space-y-1.5">
              <Label>{t("requestInfoLabel")}</Label>
              <textarea
                autoFocus
                rows={5}
                maxLength={2000}
                value={requestMessage}
                onChange={(event) => setRequestMessage(event.target.value)}
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRequestInfoOpen(false)}
              >
                {tCommon("action.cancel")}
              </Button>
              <Button
                loading={requestInfo.isPending}
                disabled={!requestMessage.trim()}
                onClick={sendInfoRequest}
              >
                <Send className="h-4 w-4" /> {t("submitRequest")}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
