using Hrms.Domain.Common;
using Hrms.Domain.Enums;

namespace Hrms.Domain.Entities;

// snapshot ของ MemoWorkflowStep ต่อเรื่อง — สร้างพร้อม Memo แล้ววิ่งสถานะ Waiting → Current → Done
// ขั้น Approval ที่ถูกตีกลับจะกลับเป็น Waiting และขั้นก่อนหน้ากลับเป็น Current
public class MemoStepInstance : BaseEntity
{
    public Guid MemoId { get; set; }
    // อ้างกลับ definition ต้นทาง (traceability) — SetNull ถ้า definition ถูกลบ
    public Guid? SourceStepId { get; set; }

    public int SortOrder { get; set; }
    public string Label { get; set; } = string.Empty;
    public MemoStepKind StepKind { get; set; } = MemoStepKind.Work;
    public RoleType AssigneeRoleCode { get; set; } = RoleType.Supervisor;
    public Guid? AssigneeEmployeeId { get; set; }

    public MemoStepStatus Status { get; set; } = MemoStepStatus.Waiting;

    public DateTime? ActedAt { get; set; }
    public Guid? ActedByEmployeeId { get; set; }
    // ความเห็นตอน complete/approve หรือเหตุผลตอน reject
    public string? ActionNote { get; set; }

    public Memo Memo { get; set; } = null!;
    public MemoWorkflowStep? SourceStep { get; set; }
    public Employee? AssigneeEmployee { get; set; }
    public Employee? ActedByEmployee { get; set; }
}
