using Hrms.Api.Authorization;
using Hrms.Application.Features.Permissions.Commands;
using Hrms.Application.Features.Permissions.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/permissions")]
[Authorize]
public class PermissionController(IMediator mediator) : ControllerBase
{
    /// <summary>ดูรายการ permission ทั้งหมดในระบบ (HR/Admin)</summary>
    [HttpGet]
    [Authorize(Policy = AuthPolicies.RequireHr)]
    public async Task<IActionResult> GetAll([FromQuery] string? module, CancellationToken ct)
        => Ok(await mediator.Send(new GetPermissionsQuery(module), ct));

    /// <summary>ดู permission matrix ทุก role (Admin)</summary>
    [HttpGet("roles")]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> GetAllRoles(CancellationToken ct)
        => Ok(await mediator.Send(new GetAllRolePermissionsQuery(), ct));

    /// <summary>ดู permission ของ role เดียว (Admin)</summary>
    [HttpGet("roles/{roleId:guid}")]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> GetByRole(Guid roleId, CancellationToken ct)
        => Ok(await mediator.Send(new GetRolePermissionsQuery(roleId), ct));

    /// <summary>Bulk set permission ของ role — replace all (Admin)</summary>
    [HttpPut("roles/{roleId:guid}")]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> SetRolePermissions(
        Guid roleId, [FromBody] SetRolePermissionsCommand command, CancellationToken ct)
        => Ok(await mediator.Send(command with { RoleId = roleId }, ct));

    /// <summary>Grant permission เดี่ยวให้ role (Admin)</summary>
    [HttpPost("roles/{roleId:guid}/grant")]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> Grant(
        Guid roleId, [FromBody] GrantPermissionCommand command, CancellationToken ct)
    {
        await mediator.Send(command with { RoleId = roleId }, ct);
        return NoContent();
    }

    /// <summary>Revoke permission จาก role (Admin)</summary>
    [HttpPost("roles/{roleId:guid}/revoke")]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> Revoke(
        Guid roleId, [FromBody] RevokePermissionCommand command, CancellationToken ct)
    {
        await mediator.Send(command with { RoleId = roleId }, ct);
        return NoContent();
    }
}
