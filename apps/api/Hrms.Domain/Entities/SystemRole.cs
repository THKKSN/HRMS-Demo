using Hrms.Domain.Common;
using Hrms.Domain.Enums;

namespace Hrms.Domain.Entities;

public class SystemRole : BaseEntity
{
    public RoleType Code { get; set; }
    public string NameTh { get; set; } = string.Empty;
    public bool IsSystem { get; set; } = true;
    public bool IsActive { get; set; } = true;

    public ICollection<EmployeeRole> EmployeeRoles { get; set; } = new List<EmployeeRole>();
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
