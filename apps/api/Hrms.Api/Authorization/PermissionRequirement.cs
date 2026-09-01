using Microsoft.AspNetCore.Authorization;

namespace Hrms.Api.Authorization;

public class PermissionRequirement(string permissionCode) : IAuthorizationRequirement
{
    public string PermissionCode { get; } = permissionCode;
}
