"use client";

import { MemoPendingCard } from "./MemoPendingCard";
import { TicketOverviewSection } from "./TicketOverviewSection";

// Executive ยังไม่เปิดใช้ภาพรวมการเข้างาน (ไม่มีสิทธิ์ attendance:view-all)
// จึงตัดส่วน attendance ออกจาก UI ไปก่อน — เหลือ Memo รออนุมัติ + ภาพรวมการแจ้งเรื่องทุกบริษัท
export function ExecutiveDashboard() {
  return (
    <div className="space-y-5">
      <MemoPendingCard variant="approval" />
      <TicketOverviewSection showCompanyFilter showSlowClosers />
    </div>
  );
}
