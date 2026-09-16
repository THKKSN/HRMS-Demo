import {
  CheckCircle2,
  CircleDot,
  Play,
  RotateCcw,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import type { TicketPriority } from "@hrms/shared-types";
import * as fmt from "@hrms/i18n/format";

// ค่าคงที่/helper ที่ module ในหน้า ticket detail ใช้ร่วมกัน — แยกออกมาเพื่อไม่ให้แต่ละ modal import กันเอง
// ป้ายความเร่งด่วนอยู่ที่ status.ticketPriority (เรียกด้วย useTranslations ในคอมโพเนนต์)

export const PRIORITIES: TicketPriority[] = ["Low", "Medium", "High", "Critical"];

export const MAX_ACTIVITY_FILES = 5;
export const MAX_COMPLETION_FILES = 5;
export const ACTIVITY_CARD_PREVIEW_COUNT = 3;

// ข้อความ error ย้ายไปที่ hook กลาง `useApiError()` แล้ว (แปลจาก code ที่ API ส่งมาตามกติกา D7)

export function ticketDateTime(value?: string) {
  if (!value) return "-";
  return fmt.formatDateTime(new Date(value), {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function eventStation(action: string) {
  const value = action.toLowerCase();
  if (value.includes("reject")) {
    return { Icon: XCircle, station: "border-red-200 bg-red-50 text-red-700" };
  }
  if (
    value.includes("close") ||
    value.includes("resolve") ||
    value.includes("approve")
  ) {
    return {
      Icon: CheckCircle2,
      station: "border-green-200 bg-green-50 text-green-700",
    };
  }
  if (
    value.includes("return") ||
    value.includes("request-info") ||
    value.includes("waiting")
  ) {
    return {
      Icon: RotateCcw,
      station: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  if (value.includes("start") || value.includes("resume")) {
    return { Icon: Play, station: "border-cyan-200 bg-cyan-50 text-cyan-700" };
  }
  if (
    value.includes("assign") ||
    value.includes("claim") ||
    value.includes("accept") ||
    value.includes("routing")
  ) {
    return {
      Icon: UserRoundCheck,
      station: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }
  return {
    Icon: CircleDot,
    station: "border-border bg-muted text-muted-foreground",
  };
}

export function InfoRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap text-foreground">
        {children ?? (value || "-")}
      </dd>
    </div>
  );
}
