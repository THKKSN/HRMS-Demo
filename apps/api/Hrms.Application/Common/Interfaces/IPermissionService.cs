namespace Hrms.Application.Common.Interfaces;

public interface IPermissionService
{
    /// <summary>ดึง permission codes ทั้งหมดของ role (cache-first)</summary>
    Task<IReadOnlySet<string>> GetRolePermissionsAsync(string role, CancellationToken ct = default);

    /// <summary>ตรวจว่า user มี permission หรือไม่</summary>
    Task<bool> HasPermissionAsync(ICurrentUser user, string permissionCode, CancellationToken ct = default);

    /// <summary>Invalidate cache เมื่อ Admin แก้ไข RolePermission</summary>
    Task InvalidateCacheAsync(string role);
}
