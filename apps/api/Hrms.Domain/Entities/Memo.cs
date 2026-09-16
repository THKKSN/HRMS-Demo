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

    // snapshot ผู้อนุมัติด่านแรกจาก MemoType ณ เวลาสร้างเรื่อง — แก้ config ภายหลังไม่กระทบเรื่องเดิม
    // EmployeeId = null คือ pool ทั้งระบบของ role นั้น (default Executive/null = พฤติกรรมเดิม)
    public RoleType FirstApproverRoleCodeSnapshot { get; set; } = RoleType.Executive;
    public Guid? FirstApproverEmployeeIdSnapshot { get; set; }

    // ขั้นตอนที่กำลังรอดำเนินการอยู่ (null = ยังไม่เริ่ม step หรือ step ครบหมดแล้ว/ไม่มี step)
    public Guid? CurrentStepInstanceId { get; set; }

    public DateTime? ApprovedAt { get; set; }
    // Executive คนไหนกดอนุมัติจริง (pool — ไม่ resolve ล่วงหน้า ใครกดก่อนคือคนนั้น)
    // ไม่ snapshot ชื่อ — join Employee ดึงชื่อสดตอนแสดงผล/print
    public Guid? ApprovedByEmployeeId { get; set; }
    // ความเห็นประกอบการอนุมัติ (optional) — แสดงในรายละเอียด/ใบพิมพ์
    public string? ApproveComment { get; set; }

    public DateTime? RejectedAt { get; set; }
    public string? RejectReason { get; set; }

    // ขั้นอนุมัติกลางทางย้อนเรื่องกลับมาให้ผู้ขอแก้ไข — เรื่องยังเป็น Approved แต่ workflow หยุดรอ
    // (CurrentStepInstanceId = null) จนผู้ขอกด "ส่งกลับเข้าขั้นตอน" แล้วเดินใหม่ตั้งแต่ขั้นแรก
    // ReturnedFromStepInstanceId เก็บเป็น scalar ไม่ผูก FK — memos มี FK วนกับ memo_step_instances
    // อยู่แล้วหนึ่งเส้น (CurrentStepInstanceId) ไม่เพิ่มเส้นที่สองให้ migration ซับซ้อนโดยไม่จำเป็น
    public DateTime? ReturnedToRequesterAt { get; set; }
    public string? ReturnedToRequesterReason { get; set; }
    public Guid? ReturnedFromStepInstanceId { get; set; }

    // แผนกปลายทาง (MemoType.CompanyId/DepartmentId) กด "รับทราบ" หลัง Approved เพื่อเริ่มดำเนินการ
    // (ครอบคลุมกระบวนการนอกระบบด้วย เช่น ทำ PO/ติดต่อ supplier/ตรวจตรวจรับ ไม่ track รายละเอียดขั้นตอนย่อย)
    public DateTime? AcknowledgedAt { get; set; }
    public Guid? AcknowledgedByEmployeeId { get; set; }

    // แผนกปลายทางกด "ส่งมอบแล้ว" หลังดำเนินการเสร็จ
    public DateTime? DeliveredAt { get; set; }
    public Guid? DeliveredByEmployeeId { get; set; }

    // ผู้ขอต้นเรื่องกดยืนยันตรวจรับ — ปิดจบ Memo
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
    public Employee? FirstApproverEmployeeSnapshot { get; set; }
    public MemoStepInstance? CurrentStepInstance { get; set; }
    public ICollection<MemoStepInstance> StepInstances { get; set; } = new List<MemoStepInstance>();
    public ICollection<MemoAttachment> Attachments { get; set; } = new List<MemoAttachment>();
    public ICollection<MemoActivity> Activities { get; set; } = new List<MemoActivity>();
}
