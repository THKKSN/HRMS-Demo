using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public class Shift : BaseEntity
{
    public Guid CompanyId { get; set; }
    public string Name { get; set; } = string.Empty;
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public int GracePeriodMinutes { get; set; }
    public bool IsActive { get; set; } = true;

    public Company Company { get; set; } = null!;
}
