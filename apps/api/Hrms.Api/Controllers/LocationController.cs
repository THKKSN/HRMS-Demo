using Hrms.Api.Authorization;
using Hrms.Application.Features.Locations.Commands;
using Hrms.Application.Features.Locations.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/locations")]
[Authorize(Policy = AuthPolicies.RequireHr)]
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
            request.Address), ct);
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
            request.IsActive), ct);
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
            request.IsActive), ct);
        return Ok(result);
    }
}

public record CreateLocationRequest(
    Guid CompanyId,
    string Name,
    double Latitude,
    double Longitude,
    int RadiusMeters,
    int? ProvinceId,
    int? DistrictId,
    int? SubDistrictId,
    string? Address);

public record UpdateLocationRequest(
    string Name,
    double Latitude,
    double Longitude,
    int RadiusMeters,
    int? ProvinceId,
    int? DistrictId,
    int? SubDistrictId,
    string? Address,
    bool IsActive);

public record ToggleLocationStatusRequest(bool IsActive);
