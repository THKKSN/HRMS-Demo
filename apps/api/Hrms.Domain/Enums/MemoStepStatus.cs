namespace Hrms.Domain.Enums;

public enum MemoStepStatus
{
    // ยังไม่ถึงคิว
    Waiting,
    // กำลังรอผู้รับผิดชอบขั้นนี้ดำเนินการ
    Current,
    // เสร็จแล้ว (Work: ดำเนินการเสร็จ / Approval: อนุมัติ)
    Done,
    // ขั้น Approval กดไม่อนุมัติ — Memo ทั้งเรื่องจบเป็น Rejected
    Rejected
}
