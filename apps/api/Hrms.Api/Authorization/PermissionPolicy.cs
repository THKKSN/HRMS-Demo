namespace Hrms.Api.Authorization;

/// <summary>สร้างชื่อ policy สำหรับ [Authorize(Policy = PermissionPolicy.For("company:view"))]</summary>
public static class PermissionPolicy
{
    public static string For(string permissionCode) => PermissionPolicyProvider.Prefix + permissionCode;
}
