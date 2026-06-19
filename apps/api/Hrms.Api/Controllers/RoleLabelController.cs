using Hrms.Api.Authorization;
using Hrms.Application.Features.RoleLabels.Commands;
using Hrms.Application.Features.RoleLabels.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/role-labels")]
[Authorize(Policy = AuthPolicies.RequireHr)]
public class RoleLabelController(IMediator mediator) : ControllerBase
{
    /// <summary>รายการ Role Label ของ company</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid companyId,
        [FromQuery] bool includeInactive = false,
        CancellationToken ct = default)
    {
        var result = await mediator.Send(new GetRoleLabelsQuery(companyId, includeInactive), ct);
        return Ok(result);
    }

    /// <summary>สร้าง Role Label ใหม่</summary>
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateRoleLabelRequest request,
        CancellationToken ct)
    {
        var result = await mediator.Send(new CreateRoleLabelCommand(request.CompanyId, request.Name), ct);
        return CreatedAtAction(nameof(GetAll), new { companyId = result.CompanyId }, result);
    }

    /// <summary>แก้ไข Role Label</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateRoleLabelRequest request,
        CancellationToken ct)
    {
        var result = await mediator.Send(new UpdateRoleLabelCommand(id, request.Name, request.IsActive), ct);
        return Ok(result);
    }

    /// <summary>ลบ Role Label (ลบไม่ได้ถ้ามีพนักงานใช้อยู่)</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await mediator.Send(new DeleteRoleLabelCommand(id), ct);
        return NoContent();
    }
}

public record CreateRoleLabelRequest(Guid CompanyId, string Name);
public record UpdateRoleLabelRequest(string Name, bool IsActive);
