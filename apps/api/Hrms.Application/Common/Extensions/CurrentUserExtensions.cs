using Hrms.Application.Common.Interfaces;
using Hrms.Domain.Enums;

namespace Hrms.Application.Common.Extensions;

public static class CurrentUserExtensions
{
    /// <summary>
    /// ตรวจว่า user มี role นั้นๆ ไหม
    /// ถ้า companyId = null → เช็คแค่ว่ามี role (ไม่ดู company)
    /// ถ้า companyId ระบุ → ต้องมี role ใน company นั้น หรือมี role ที่ companyId = null (super scope)
    /// </summary>
    public static bool HasRole(this ICurrentUser user, RoleType role, Guid? companyId = null)
    {
        var roleName = role.ToString();

        return user.Roles.Any(r =>
            r.Role == roleName &&
            (companyId == null || r.CompanyId == null || r.CompanyId == companyId));
    }

    public static bool IsAdminOrHr(this ICurrentUser user, Guid? companyId = null)
        => user.HasRole(RoleType.Admin, companyId) || user.HasRole(RoleType.Hr, companyId);

    public static bool IsSupervisorOrAbove(this ICurrentUser user, Guid? companyId = null)
        => user.HasRole(RoleType.Supervisor, companyId) || user.IsAdminOrHr(companyId);
}
