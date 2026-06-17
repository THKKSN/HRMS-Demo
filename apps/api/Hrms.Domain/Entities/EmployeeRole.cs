using Hrms.Domain.Common;
using Hrms.Domain.Enums;

namespace Hrms.Domain.Entities;

public class EmployeeRole : BaseEntity
{
    public Guid EmployeeId { get; set; }
    public RoleType Role { get; set; }
    public Guid? CompanyId { get; set; }
    public Guid? DepartmentId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? ValidFrom { get; set; }
    public DateTime? ValidTo { get; set; }
    public Guid? GrantedBy { get; set; }

    public Employee Employee { get; set; } = null!;
    public Company? Company { get; set; }
    public Department? Department { get; set; }
}
