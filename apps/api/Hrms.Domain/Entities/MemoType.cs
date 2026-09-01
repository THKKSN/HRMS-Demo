using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public class MemoType : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    // ปลายทางที่แจ้งเตือนหลัง Approved — ส่งหา Supervisor ทุกคนใน Company/Department นี้
    // ไม่ใช่ตัวกรองว่าใครเห็น MemoType นี้ได้บ้าง (ทุก Employee เห็น MemoType ทั้งหมดเสมอ)
    // Approver ระหว่างทางคือ role Executive เสมอ (แบบ pool ทั้งระบบ ไม่ผูกกับ MemoType นี้)
    public Guid CompanyId { get; set; }
    public Guid DepartmentId { get; set; }

    public bool IsActive { get; set; } = true;

    public Company Company { get; set; } = null!;
    public Department Department { get; set; } = null!;
    public ICollection<MemoCategory> Categories { get; set; } = new List<MemoCategory>();
}
