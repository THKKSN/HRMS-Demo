using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

// ไฟล์แนบของ Memo — แนบได้ 3 จุด: ตอนสร้างเรื่อง (StepInstance/Activity เป็น null ทั้งคู่),
// ตอนทำ step (MemoStepInstanceId), หรือแนบกับ activity card (MemoActivityId)
public class MemoAttachment : BaseEntity
{
    public Guid MemoId { get; set; }
    public Guid? MemoStepInstanceId { get; set; }
    public Guid? MemoActivityId { get; set; }
    public Guid? UploadedByEmployeeId { get; set; }

    public string Url { get; set; } = string.Empty;
    public string? FileName { get; set; }
    public string? ContentType { get; set; }
    public long SizeBytes { get; set; }
    public string? StorageKey { get; set; }

    public Memo Memo { get; set; } = null!;
    public MemoStepInstance? MemoStepInstance { get; set; }
    public MemoActivity? MemoActivity { get; set; }
    public Employee? UploadedByEmployee { get; set; }
}
