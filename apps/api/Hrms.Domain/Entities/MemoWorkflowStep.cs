using Hrms.Domain.Common;
using Hrms.Domain.Enums;

namespace Hrms.Domain.Entities;

// ขั้นตอนทำงานหลังแผนกรับทราบ (definition) — config ต่อ MemoType ผ่านหน้า settings
// ตอนสร้าง Memo จะถูก copy เป็น MemoStepInstance (snapshot) แก้ definition ภายหลังไม่กระทบเรื่องที่วิ่งอยู่
public class MemoWorkflowStep : BaseEntity
{
    public Guid MemoTypeId { get; set; }
    public int SortOrder { get; set; }
    public string Label { get; set; } = string.Empty;
    public MemoStepKind StepKind { get; set; } = MemoStepKind.Work;

    // ผู้รับผิดชอบขั้นนี้ — role + คน (null = ทุกคนใน role ที่ scope ตรงบริษัท/แผนกปลายทางของ MemoType)
    public RoleType AssigneeRoleCode { get; set; } = RoleType.Supervisor;
    public Guid? AssigneeEmployeeId { get; set; }

    public bool IsActive { get; set; } = true;

    public MemoType MemoType { get; set; } = null!;
    public Employee? AssigneeEmployee { get; set; }
}
