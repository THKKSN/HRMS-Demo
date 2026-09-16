using Hrms.Application.Features.Locations.Commands;
using Hrms.Application.Features.Locations.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/locations")]
[Authorize(Policy = "perm:company:manage-locations")]
public class LocationController(IMediator mediator) : ControllerBase
{
    /// <summary>รายการ Location ทั้งหมด (HR / Admin)</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? companyId,
        [FromQuery] bool includeInactive = false,
        CancellationToken ct = default)
    {
        var result = await mediator.Send(new GetLocationsQuery(companyId, includeInactive), ct);
        return Ok(result);
    }

    /// <summary>รายละเอียด Location (HR / Admin)</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetLocationByIdQuery(id), ct);
        return Ok(result);
    }

    /// <summary>สร้าง Location ใหม่ (HR / Admin)</summary>
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateLocationRequest request,
        CancellationToken ct)
    {
        var result = await mediator.Send(new CreateLocationCommand(
            request.CompanyId,
            request.Name,
            request.Latitude,
            request.Longitude,
            request.RadiusMeters,
            request.ProvinceId,
            request.DistrictId,
            request.SubDistrictId,
            request.Address,
            request.NameEn,
            request.NameId), ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    /// <summary>แก้ไข Location (HR / Admin)</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateLocationRequest request,
        CancellationToken ct)
    {
        var result = await mediator.Send(new UpdateLocationCommand(
            id,
            request.Name,
            request.Latitude,
            request.Longitude,
            request.RadiusMeters,
            request.ProvinceId,
            request.DistrictId,
            request.SubDistrictId,
            request.Address,
            request.IsActive,
            request.NameEn,
            request.NameId), ct);
        return Ok(result);
    }

    /// <summary>เปิด/ปิด Location (HR / Admin)</summary>
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> ToggleStatus(
        Guid id,
        [FromBody] ToggleLocationStatusRequest request,
        CancellationToken ct)
    {
        var current = await mediator.Send(new GetLocationByIdQuery(id), ct);
        // ส่งชื่อหลายภาษาเดิมกลับไปด้วย เพื่อไม่ต้องพึ่งพฤติกรรม "null = คงค่าเดิม" ของ NameText.Apply
        var result = await mediator.Send(new UpdateLocationCommand(
            id,
            current.Name,
            current.Latitude,
            current.Longitude,
            current.RadiusMeters,
            current.ProvinceId,
            current.DistrictId,
            current.SubDistrictId,
            current.Address,
            request.IsActive,
            current.NameEn,
            current.NameId), ct);
        return Ok(result);
    }
}

// NameEn/NameId = ชื่อหลายภาษาของ master data (i18n Phase M) — ไม่ส่ง = คงค่าเดิม, ส่ง "" = ล้างค่า
public record CreateLocationRequest(
    Guid CompanyId,
    string Name,
    double Latitude,
    double Longitude,
    int RadiusMeters,
    int? ProvinceId,
    int? DistrictId,
    int? SubDistrictId,
    string? Address,
    string? NameEn = null,
    string? NameId = null);

public record UpdateLocationRequest(
    string Name,
    double Latitude,
    double Longitude,
    int RadiusMeters,
    int? ProvinceId,
    int? DistrictId,
    int? SubDistrictId,
    string? Address,
    bool IsActive,
    string? NameEn = null,
    string? NameId = null);

public record ToggleLocationStatusRequest(bool IsActive);
