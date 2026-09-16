"use client";

import { useTranslations } from "next-intl";
import type { TicketDetailDto } from "@hrms/shared-types";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { eventStation, ticketDateTime } from "./ticket-detail-shared";

/** Status Station: timeline เหตุการณ์จาก audit log ของ ticket */
export function TicketEventsModal({
  ticket,
  onClose,
}: {
  ticket: TicketDetailDto;
  onClose: () => void;
}) {
  const t = useTranslations("admin.ticket.events");
  const tStatus = useTranslations("status.ticket");
  return (
    <Modal
      open
      onClose={onClose}
      title={t("title", { ticketNo: ticket.ticketNo })}
      size="lg"
    >
      {ticket.auditEvents.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between gap-4 border-y border-border py-3">
            <div>
              <p className="text-xs text-muted-foreground">{t("currentStatus")}</p>
              <p className="mt-1 text-sm font-semibold">{tStatus(ticket.status)}</p>
            </div>
            <Badge variant="secondary">
              {t("stepCount", { count: ticket.auditEvents.length })}
            </Badge>
          </div>

          <div className="max-h-[60vh] overflow-y-auto pr-1">
            {ticket.auditEvents.map((event, index) => {
              const { Icon, station } = eventStation(event.action);
              return (
                <div key={event.id} className="grid grid-cols-[36px_1fr] gap-3">
                  <div className="relative flex justify-center">
                    {index < ticket.auditEvents.length - 1 && (
                      <span
                        className="absolute bottom-0 top-9 w-px bg-border"
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border ${station}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="min-w-0 pb-5 pt-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="whitespace-pre-wrap text-sm font-medium leading-5">
                        {event.description}
                      </p>
                      {index === 0 && <Badge variant="success">latest</Badge>}
                    </div>
                    {/* event.description มาจาก audit log ที่ API เขียนเป็นไทย — รอ Phase 3 */}
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {event.performedByName ?? t("systemActor")}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {ticketDateTime(event.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Modal>
  );
}
