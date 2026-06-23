using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public class LeaveType : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string NameTh { get; set; } = string.Empty;
    public string? NameEn { get; set; }
    public int DefaultDaysPerYear { get; set; }
    public bool RequiresAttachment { get; set; }
    public bool IsActive { get; set; } = true;
}
