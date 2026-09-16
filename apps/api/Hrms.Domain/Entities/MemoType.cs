using Hrms.Domain.Common;
using Hrms.Domain.Enums;

namespace Hrms.Domain.Entities;

public class MemoType : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? NameEn { get; set; }
    public string? NameId { get; set; }

    // ปลายทางที่แจ้งเตือนหลัง Approved — ส่งหา Supervisor ทุกคนใน Company/Department นี้
    // ไม่ใช่ตัวกรองว่าใครเห็น MemoType นี้ได้บ้าง (ทุก Employee เห็น MemoType ทั้งหมดเสมอ)
    public Guid CompanyId { get; set; }
    public Guid DepartmentId { get; set; }

    // ผู้อนุมัติด่านแรก — role + คน (null = ทุกคนใน role แบบ pool ทั้งระบบ)
    // default Executive/null = พฤติกรรมเดิมก่อนมี config
    public RoleType FirstApproverRoleCode { get; set; } = RoleType.Executive;
    public Guid? FirstApproverEmployeeId { get; set; }

    public bool IsActive { get; set; } = true;

    public Company Company { get; set; } = null!;
    public Department Department { get; set; } = null!;
    public Employee? FirstApproverEmployee { get; set; }
    public ICollection<MemoCategory> Categories { get; set; } = new List<MemoCategory>();
    public ICollection<MemoWorkflowStep> WorkflowSteps { get; set; } = new List<MemoWorkflowStep>();
}
