using Hrms.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;

namespace Hrms.Api.Authorization;

public class PermissionAuthorizationHandler(
    ICurrentUser currentUser,
    IPermissionService permissionService)
    : AuthorizationHandler<PermissionRequirement>
{
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        if (await permissionService.HasPermissionAsync(currentUser, requirement.PermissionCode))
            context.Succeed(requirement);
    }
}
