"use client";

import { PendingWorkChips } from "./PendingWorkChips";
import { TicketOverviewSection } from "./TicketOverviewSection";

// Executive ยังไม่เปิดใช้ภาพรวมการเข้างาน (ไม่มีสิทธิ์ attendance:view-all)
// จึงตัดส่วน attendance ออกจาก UI ไปก่อน — เหลืองานค้างที่ต้องลงมือ + ภาพรวมทุกบริษัท
export function ExecutiveDashboard() {
  return (
    <div className="space-y-5">
      <PendingWorkChips />
      <TicketOverviewSection showCompanyFilter showSlowClosers />
    </div>
  );
}
