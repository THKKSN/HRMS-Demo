using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public class RolePermission : BaseEntity
{
    public Guid RoleId { get; set; }
    public Guid PermissionId { get; set; }
    public Guid? GrantedBy { get; set; }
    public DateTime GrantedAt { get; set; }

    public SystemRole Role { get; set; } = null!;
    public Permission Permission { get; set; } = null!;
}
