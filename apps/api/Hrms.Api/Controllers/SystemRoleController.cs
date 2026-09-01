using Hrms.Api.Authorization;
using Hrms.Application.Features.Roles.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/system-roles")]
[Authorize(Policy = AuthPolicies.RequireHr)]
public class SystemRoleController(IMediator mediator) : ControllerBase
{
    /// <summary>รายการ role ทั้งหมดในระบบ (สำหรับ dropdown เช่น เลือก approver role ของ Memo routing)</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
        => Ok(await mediator.Send(new GetSystemRolesQuery(), ct));
}
