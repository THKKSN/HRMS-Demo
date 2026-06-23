using Hrms.Api.Authorization;
using Hrms.Application.Features.Shifts.Commands;
using Hrms.Application.Features.Shifts.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/shifts")]
[Authorize(Policy = AuthPolicies.RequireHr)]
public class ShiftController(IMediator mediator) : ControllerBase
{
    /// <summary>รายการกะงานทั้งหมด (HR / Admin)</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? companyId,
        [FromQuery] bool includeInactive = false,
        CancellationToken ct = default)
    {
        var result = await mediator.Send(new GetShiftsQuery(companyId, includeInactive), ct);
        return Ok(result);
    }

    /// <summary>รายละเอียดกะงาน (HR / Admin)</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetShiftByIdQuery(id), ct);
        return Ok(result);
    }

    /// <summary>สร้างกะงานใหม่ (HR / Admin)</summary>
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateShiftRequest request,
        CancellationToken ct)
    {
        var result = await mediator.Send(new CreateShiftCommand(
            request.CompanyId,
            request.Name,
            request.StartTime,
            request.EndTime,
            request.GracePeriodMinutes), ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    /// <summary>แก้ไขกะงาน (HR / Admin)</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateShiftRequest request,
        CancellationToken ct)
    {
        var result = await mediator.Send(new UpdateShiftCommand(
            id,
            request.Name,
            request.StartTime,
            request.EndTime,
            request.GracePeriodMinutes,
            request.IsActive), ct);
        return Ok(result);
    }

    /// <summary>เปิด/ปิดกะงาน (HR / Admin)</summary>
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> ToggleStatus(
        Guid id,
        [FromBody] ToggleShiftStatusRequest request,
        CancellationToken ct)
    {
        var current = await mediator.Send(new GetShiftByIdQuery(id), ct);
        var result = await mediator.Send(new UpdateShiftCommand(
            id,
            current.Name,
            current.StartTime,
            current.EndTime,
            current.GracePeriodMinutes,
            request.IsActive), ct);
        return Ok(result);
    }
}

public record CreateShiftRequest(
    Guid CompanyId,
    string Name,
    TimeOnly StartTime,
    TimeOnly EndTime,
    int GracePeriodMinutes);

public record UpdateShiftRequest(
    string Name,
    TimeOnly StartTime,
    TimeOnly EndTime,
    int GracePeriodMinutes,
    bool IsActive);

public record ToggleShiftStatusRequest(bool IsActive);
