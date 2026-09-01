using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public class MemoCategory : BaseEntity
{
    public Guid MemoTypeId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public MemoType MemoType { get; set; } = null!;
    public ICollection<MemoSubCategory> SubCategories { get; set; } = new List<MemoSubCategory>();
}
