using Hrms.Application.Features.ShiftOverride.Commands.RemoveEmployeeShiftOverride;
using Hrms.Application.Features.ShiftOverride.Commands.SetEmployeeShiftOverride;
using Hrms.Application.Features.ShiftOverride.Queries.GetCurrentShift;
using Hrms.Application.Features.ShiftOverride.Queries.GetEmployeeShiftOverrides;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/employees/{employeeId:guid}/shift-overrides")]
[Authorize(Policy = "perm:company:manage-shifts")]
public class EmployeeShiftOverrideController(IMediator mediator) : ControllerBase
{
    /// <summary>ประวัติ shift override ของพนักงาน</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(Guid employeeId, CancellationToken ct)
    {
        var result = await mediator.Send(new GetEmployeeShiftOverridesQuery(employeeId), ct);
        return Ok(result);
    }

    /// <summary>กะปัจจุบันที่มีผลกับพนักงาน (override / department / company)</summary>
    [HttpGet("current")]
    public async Task<IActionResult> GetCurrent(Guid employeeId, CancellationToken ct)
    {
        var result = await mediator.Send(new GetCurrentShiftQuery(employeeId), ct);
        return Ok(result);
    }

    /// <summary>ตั้งค่ากะพิเศษให้พนักงาน (ปิด overlap อัตโนมัติ)</summary>
    [HttpPost]
    public async Task<IActionResult> Set(
        Guid employeeId,
        [FromBody] SetOverrideRequest body,
        CancellationToken ct)
    {
        var id = await mediator.Send(
            new SetEmployeeShiftOverrideCommand(employeeId, body.ShiftId, body.EffectiveFrom, body.EffectiveTo, body.Reason), ct);
        return Ok(new { id });
    }

    /// <summary>ยกเลิก override (soft delete)</summary>
    [HttpDelete("{overrideId:guid}")]
    public async Task<IActionResult> Remove(Guid employeeId, Guid overrideId, CancellationToken ct)
    {
        await mediator.Send(new RemoveEmployeeShiftOverrideCommand(overrideId), ct);
        return NoContent();
    }
}

public record SetOverrideRequest(
    Guid ShiftId,
    DateOnly EffectiveFrom,
    DateOnly? EffectiveTo,
    string? Reason);
