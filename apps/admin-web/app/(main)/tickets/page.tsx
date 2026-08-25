"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight, EyeIcon, Search } from "lucide-react";
import type { TicketPriority, TicketStatus } from "@hrms/shared-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useMyTickets } from "@/hooks/use-tickets";
import { TICKET_STATUS_LABEL } from "@/lib/ticket-status";

const PAGE_SIZE = 10;

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  Low: "ปกติ",
  Medium: "กลาง",
  High: "ด่วน",
  Critical: "ด่วนมาก",
};

function statusVariant(
  status: TicketStatus,
): "default" | "secondary" | "success" | "warning" | "destructive" {
  if (status === "Open" || status === "WaitingInfo") return "warning";
  if (status === "Closed") return "success";
  if (status === "Rejected" || status === "Cancelled") return "destructive";
  return status === "Assigned" || status === "InProgress"
    ? "default"
    : "secondary";
}

function priorityClass(priority: TicketPriority) {
  if (priority === "Critical") return "text-red-700 bg-red-50";
  if (priority === "High") return "text-amber-700 bg-amber-50";
  return "text-muted-foreground bg-muted/50";
}

function thaiDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function TicketsPage() {
  const [status, setStatus] = useState<TicketStatus | undefined>();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const query = useMyTickets({
    status,
    search: search || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const totalCount = query.data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const firstItem = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px]">
        <form
          className="relative"
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(searchInput.trim());
            setPage(1);
          }}
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="pl-9"
            placeholder="ค้นหาเลข Ticket หรือชื่อเรื่อง"
          />
        </form>
        <Select
          value={status ?? ""}
          onChange={(event) => {
            setStatus(
              (event.target.value || undefined) as TicketStatus | undefined,
            );
            setPage(1);
          }}
        >
          <option value="">ทุกสถานะ</option>
          {(Object.keys(TICKET_STATUS_LABEL) as TicketStatus[]).map((item) => (
            <option key={item} value={item}>
              {TICKET_STATUS_LABEL[item]}
            </option>
          ))}
        </Select>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-background">
        <table className="w-full min-w-[1080px] text-sm">
          <thead className="border-b border-border bg-muted/30 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Ticket</th>
              <th className="px-4 py-3 font-medium">ผู้แจ้ง</th>
              <th className="px-4 py-3 font-medium">ปลายทาง</th>
              <th className="px-4 py-3 font-medium">หมวด / หัวข้อ</th>
              <th className="px-4 py-3 font-medium">ผู้รับผิดชอบ</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3 font-medium">เปิดเรื่องเมื่อ</th>
              <th className="w-32 px-4 py-3 font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading &&
              Array.from({ length: PAGE_SIZE }).map((_, index) => (
                <tr key={index} className="border-b border-border">
                  <td colSpan={8} className="px-4 py-3">
                    <div className="h-5 animate-pulse rounded bg-muted" />
                  </td>
                </tr>
              ))}
            {!query.isLoading &&
              !query.isError &&
              (query.data?.items.length ?? 0) === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-16 text-center text-muted-foreground"
                  >
                    ยังไม่มีรายการแจ้งเรื่อง
                  </td>
                </tr>
              )}
            {query.isError && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-16 text-center text-destructive"
                >
                  โหลดรายการไม่สำเร็จ
                </td>
              </tr>
            )}
            {query.data?.items.map((ticket) => (
              <tr
                key={ticket.id}
                className="border-b border-border last:border-0 hover:bg-muted/20"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-primary">{ticket.ticketNo}</p>
                  <p className="mt-1 max-w-72 truncate font-medium">
                    {ticket.title}
                  </p>
                  <span
                    className={`mt-1 inline-flex rounded px-1.5 py-0.5 text-xs ${priorityClass(ticket.priority)}`}
                  >
                    {PRIORITY_LABEL[ticket.priority]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span>{ticket.requester.nickname ? `${ticket.requester.name} (${ticket.requester.nickname})` : ticket.requester.name}</span>
                    <Badge variant={ticket.requester.type === "External" ? "destructive" : "secondary"}>
                      {ticket.requester.type === "External" ? "ภายนอก" : "ภายใน"}
                    </Badge>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{ticket.targetCompanyName}</p>
                  <p className="text-xs text-muted-foreground">
                    {ticket.targetDepartmentName}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p>{ticket.categoryName}</p>
                  <p className="text-xs text-muted-foreground">
                    {ticket.topicName}
                    {ticket.otherTopicText ? `: ${ticket.otherTopicText}` : ""}
                  </p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {ticket.currentAssigneeName ?? "รอผู้รับผิดชอบ"}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant(ticket.status)}>
                    {TICKET_STATUS_LABEL[ticket.status]}
                  </Badge>
                  {ticket.hasPendingCancellation && (
                    <p className="mt-1 text-xs text-amber-700">รอยกเลิก</p>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {thaiDateTime(ticket.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/tickets/${ticket.id}`}
                    className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-sm text-muted-foreground hover:bg-muted/80"
                  >
                    {" "}
                    <EyeIcon className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>
            แสดง {firstItem}-{lastItem} จาก {totalCount} รายการ
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              <ChevronLeft className="h-4 w-4" /> ก่อนหน้า
            </Button>
            <span>
              หน้า {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              ถัดไป <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
