using Hrms.Api.Authorization;
using Hrms.Application.Features.WeeklyHolidaySchedules.Commands;
using Hrms.Application.Features.WeeklyHolidaySchedules.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/holiday-schedules")]
[Authorize(Policy = AuthPolicies.RequireHr)]
public class WeeklyHolidayScheduleController(IMediator mediator) : ControllerBase
{
    /// <summary>รายการกฎวันหยุดประจำสัปดาห์</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? companyId,
        [FromQuery] bool includeInactive = false,
        CancellationToken ct = default)
    {
        var result = await mediator.Send(
            new GetWeeklyHolidaySchedulesQuery(companyId, includeInactive), ct);
        return Ok(result);
    }

    /// <summary>รายละเอียดกฎ</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetWeeklyHolidayScheduleByIdQuery(id), ct);
        return Ok(result);
    }

    /// <summary>Preview วันหยุดที่จะ generate จากกฎนี้ (ไม่บันทึก DB)</summary>
    [HttpGet("{id:guid}/preview")]
    public async Task<IActionResult> Preview(
        Guid id,
        [FromQuery] int? year,
        CancellationToken ct)
    {
        var queryYear = year ?? DateTime.UtcNow.AddHours(7).Year;
        var result = await mediator.Send(new PreviewHolidaysFromScheduleQuery(id, queryYear), ct);
        return Ok(result);
    }

    /// <summary>สร้างกฎใหม่</summary>
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateWeeklyHolidayScheduleRequest request,
        CancellationToken ct)
    {
        var result = await mediator.Send(new CreateWeeklyHolidayScheduleCommand(
            request.CompanyId,
            request.Name,
            request.DayOfWeek,
            request.WorkDayOccurrences), ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    /// <summary>แก้ไขกฎ</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateWeeklyHolidayScheduleRequest request,
        CancellationToken ct)
    {
        var result = await mediator.Send(new UpdateWeeklyHolidayScheduleCommand(
            id,
            request.Name,
            request.DayOfWeek,
            request.WorkDayOccurrences,
            request.IsActive), ct);
        return Ok(result);
    }

    /// <summary>เปิด/ปิดกฎ (Soft Delete)</summary>
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> ToggleStatus(
        Guid id,
        [FromBody] ToggleWeeklyHolidayScheduleStatusRequest request,
        CancellationToken ct)
    {
        var result = await mediator.Send(
            new ToggleWeeklyHolidayScheduleStatusCommand(id, request.IsActive), ct);
        return Ok(result);
    }
}

public record CreateWeeklyHolidayScheduleRequest(
    Guid? CompanyId,
    string Name,
    DayOfWeek DayOfWeek,
    List<int> WorkDayOccurrences);

public record UpdateWeeklyHolidayScheduleRequest(
    string Name,
    DayOfWeek DayOfWeek,
    List<int> WorkDayOccurrences,
    bool IsActive);

public record ToggleWeeklyHolidayScheduleStatusRequest(bool IsActive);
