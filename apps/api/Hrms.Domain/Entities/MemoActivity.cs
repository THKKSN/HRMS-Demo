using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

// การ์ด activity ระหว่างดำเนินการ — โพสต์โดยผู้เกี่ยวข้องกับเรื่อง
// IsSystem = true คือการ์ดที่ระบบสร้างเอง (เช่น บันทึกการตีกลับจากขั้นอนุมัติ)
public class MemoActivity : BaseEntity
{
    public Guid MemoId { get; set; }
    public Guid? MemoStepInstanceId { get; set; }
    public Guid? AuthorEmployeeId { get; set; }
    public string Message { get; set; } = string.Empty;
    public bool IsSystem { get; set; }

    public Memo Memo { get; set; } = null!;
    public MemoStepInstance? MemoStepInstance { get; set; }
    public Employee? AuthorEmployee { get; set; }
    public ICollection<MemoAttachment> Attachments { get; set; } = new List<MemoAttachment>();
}
