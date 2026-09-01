using Hrms.Application.Features.AttendancePolicies.Commands;
using Hrms.Application.Features.AttendancePolicies.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/attendance-policies")]
[Authorize(Policy = "perm:attendance:manage-policy")]
public class AttendancePolicyController(IMediator mediator) : ControllerBase
{
    /// <summary>ดู policy ของบริษัท (ต้องมี attendance:manage-policy permission)</summary>
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] Guid companyId, CancellationToken ct)
    {
        var result = await mediator.Send(new GetAttendancePolicyQuery(companyId), ct);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>สร้างหรืออัปเดต policy (Upsert) (ต้องมี attendance:manage-policy permission)</summary>
    [HttpPut]
    public async Task<IActionResult> Upsert(
        [FromBody] UpsertAttendancePolicyCommand command, CancellationToken ct)
        => Ok(await mediator.Send(command, ct));

    /// <summary>รายงานพนักงานที่ละเมิดกฎการเข้างานประจำเดือน (HR / Admin / Supervisor)</summary>
    [HttpGet("violations")]
    [Authorize]
    public async Task<IActionResult> GetViolations(
        [FromQuery] GetAttendanceViolationsQuery query, CancellationToken ct)
        => Ok(await mediator.Send(query, ct));
}
