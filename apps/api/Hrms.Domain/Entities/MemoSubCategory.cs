using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public class MemoSubCategory : BaseEntity
{
    public Guid MemoCategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public MemoCategory MemoCategory { get; set; } = null!;
}
