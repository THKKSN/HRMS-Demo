using Hrms.Domain.Common;
using Hrms.Domain.Enums;

namespace Hrms.Domain.Entities;

public class Memo : BaseEntity
{
    public string MemoNo { get; set; } = string.Empty;
    public Guid MemoTypeId { get; set; }
    public Guid MemoCategoryId { get; set; }
    public Guid MemoSubCategoryId { get; set; }
    public string Detail { get; set; } = string.Empty;

    public Guid RequesterId { get; set; }

    // snapshot ตอนสร้างเรื่อง — CompanyId/DepartmentId ของผู้ขอ ณ เวลานั้น
    public Guid CompanyId { get; set; }
    public Guid DepartmentId { get; set; }

    // snapshot ชื่อ Category/SubCategory ณ เวลาสร้างเรื่อง กัน admin แก้ไข/ปิดชื่อภายหลังแล้วเรื่องเก่าแสดงผลเพี้ยน
    public string MemoCategoryNameSnapshot { get; set; } = string.Empty;
    public string MemoSubCategoryNameSnapshot { get; set; } = string.Empty;

    public MemoStatus Status { get; set; } = MemoStatus.Pending;

    public DateTime? ApprovedAt { get; set; }
    // Executive คนไหนกดอนุมัติจริง (pool — ไม่ resolve ล่วงหน้า ใครกดก่อนคือคนนั้น)
    // ไม่ snapshot ชื่อ — join Employee ดึงชื่อสดตอนแสดงผล/print
    public Guid? ApprovedByEmployeeId { get; set; }

    public DateTime? RejectedAt { get; set; }
    public string? RejectReason { get; set; }

    // แผนกปลายทาง (MemoType.CompanyId/DepartmentId) กด "รับทราบ" หลัง Approved เพื่อเริ่มดำเนินการ
    // (ครอบคลุมกระบวนการนอกระบบด้วย เช่น ทำ PO/ติดต่อ supplier/ตรวจรับของ ไม่ track รายละเอียดขั้นตอนย่อย)
    public DateTime? AcknowledgedAt { get; set; }
    public Guid? AcknowledgedByEmployeeId { get; set; }

    // แผนกปลายทางกด "ส่งมอบแล้ว" หลังดำเนินการเสร็จ
    public DateTime? DeliveredAt { get; set; }
    public Guid? DeliveredByEmployeeId { get; set; }

    // ผู้ขอต้นเรื่องกดยืนยันรับของ/รับงาน — ปิดจบ Memo
    public DateTime? ReceivedAt { get; set; }
    public Guid? ReceivedByEmployeeId { get; set; }

    public MemoType MemoType { get; set; } = null!;
    public MemoCategory MemoCategory { get; set; } = null!;
    public MemoSubCategory MemoSubCategory { get; set; } = null!;
    public Employee Requester { get; set; } = null!;
    public Company Company { get; set; } = null!;
    public Department Department { get; set; } = null!;
    public Employee? ApprovedByEmployee { get; set; }
    public Employee? AcknowledgedByEmployee { get; set; }
    public Employee? DeliveredByEmployee { get; set; }
    public Employee? ReceivedByEmployee { get; set; }
}
