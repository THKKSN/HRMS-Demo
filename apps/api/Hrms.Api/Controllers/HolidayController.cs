using Hrms.Api.Authorization;
using Hrms.Application.Features.Holidays.Commands;
using Hrms.Application.Features.Holidays.Dtos;
using Hrms.Application.Features.Holidays.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/holidays")]
public class HolidayController(IMediator mediator) : ControllerBase
{
    /// <summary>รายการวันหยุด (ทุก role ดูได้)</summary>
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? year,
        [FromQuery] Guid? companyId,
        [FromQuery] bool includeInactive = false,
        CancellationToken ct = default)
    {
        var queryYear = year ?? DateTime.UtcNow.AddHours(7).Year;
        var result = await mediator.Send(new GetHolidaysQuery(queryYear, companyId, includeInactive), ct);
        return Ok(result);
    }

    /// <summary>รายละเอียดวันหยุด (HR / Admin)</summary>
    [HttpGet("{id:guid}")]
    [Authorize(Policy = AuthPolicies.RequireHr)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetHolidayByIdQuery(id), ct);
        return Ok(result);
    }

    /// <summary>เพิ่มวันหยุด (HR / Admin)</summary>
    [HttpPost]
    [Authorize(Policy = AuthPolicies.RequireHr)]
    public async Task<IActionResult> Create(
        [FromBody] CreateHolidayRequest request,
        CancellationToken ct)
    {
        var result = await mediator.Send(new CreateHolidayCommand(
            request.CompanyId,
            request.Name,
            request.Date), ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    /// <summary>แก้ไขวันหยุด (HR / Admin)</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = AuthPolicies.RequireHr)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateHolidayRequest request,
        CancellationToken ct)
    {
        var result = await mediator.Send(new UpdateHolidayCommand(
            id,
            request.Name,
            request.Date,
            request.IsActive), ct);
        return Ok(result);
    }

    /// <summary>เปิด/ปิดวันหยุด (HR / Admin)</summary>
    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = AuthPolicies.RequireHr)]
    public async Task<IActionResult> ToggleStatus(
        Guid id,
        [FromBody] ToggleHolidayStatusRequest request,
        CancellationToken ct)
    {
        var current = await mediator.Send(new GetHolidayByIdQuery(id), ct);
        var result = await mediator.Send(new UpdateHolidayCommand(
            id,
            current.Name,
            current.Date,
            request.IsActive), ct);
        return Ok(result);
    }

    /// <summary>Preview วันเสาร์ที่เป็นวันหยุดตามกฎ (เสาร์แรกของเดือน = วันทำงาน) ไม่บันทึก DB</summary>
    [HttpGet("generate-saturdays")]
    [Authorize(Policy = AuthPolicies.RequireHr)]
    public async Task<IActionResult> GenerateSaturdays(
        [FromQuery] int? year,
        [FromQuery] Guid? companyId,
        [FromQuery] string holidayName = "วันหยุดประจำสัปดาห์",
        CancellationToken ct = default)
    {
        var queryYear = year ?? DateTime.UtcNow.AddHours(7).Year;
        var result = await mediator.Send(
            new GenerateSaturdayHolidaysQuery(queryYear, companyId, holidayName), ct);
        return Ok(result);
    }

    /// <summary>สร้างวันหยุดหลายรายการครั้งเดียว — skip duplicate, partial success (HR / Admin)</summary>
    [HttpPost("bulk")]
    [Authorize(Policy = AuthPolicies.RequireHr)]
    public async Task<IActionResult> BulkCreate(
        [FromBody] BulkCreateHolidaysRequest request,
        CancellationToken ct)
    {
        var result = await mediator.Send(
            new BulkCreateHolidaysCommand(request.Holidays), ct);
        return Ok(result);
    }
}

public record CreateHolidayRequest(
    Guid? CompanyId,
    string Name,
    DateOnly Date);

public record UpdateHolidayRequest(
    string Name,
    DateOnly Date,
    bool IsActive);

public record ToggleHolidayStatusRequest(bool IsActive);

public record BulkCreateHolidaysRequest(List<BulkHolidayItem> Holidays);
