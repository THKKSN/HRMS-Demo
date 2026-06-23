using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public class Holiday : BaseEntity
{
    /// <summary>null = วันหยุดแห่งชาติ, ระบุ = วันหยุดเฉพาะ company</summary>
    public Guid? CompanyId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public bool IsActive { get; set; } = true;

    public Company? Company { get; set; }
}
