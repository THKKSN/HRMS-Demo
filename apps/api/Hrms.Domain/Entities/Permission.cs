using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public class Permission : BaseEntity
{
    public string Code { get; set; } = string.Empty;        // "leave:approve"
    public string Module { get; set; } = string.Empty;      // "leave"
    public string Action { get; set; } = string.Empty;      // "approve"
    public string Description { get; set; } = string.Empty; // ภาษาไทย
    public bool IsSystem { get; set; } = true;              // ลบไม่ได้

    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
