using Hrms.Api.Authorization;
using Hrms.Application.Features.Departments.Commands;
using Hrms.Application.Features.Departments.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/departments")]
[Authorize(Policy = AuthPolicies.RequireHr)]
public class DepartmentController(IMediator mediator) : ControllerBase
{
    /// <summary>รายการแผนกทั้งหมด พร้อม employeeCount (HR / Admin)</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? companyId,
        [FromQuery] bool includeInactive = false,
        CancellationToken ct = default)
    {
        var result = await mediator.Send(new GetDepartmentsQuery(companyId, includeInactive), ct);
        return Ok(result);
    }

    /// <summary>รายละเอียดแผนก (HR / Admin)</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetDepartmentByIdQuery(id), ct);
        return Ok(result);
    }

    /// <summary>สร้างแผนกใหม่ (HR / Admin)</summary>
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateDepartmentRequest request,
        CancellationToken ct)
    {
        var result = await mediator.Send(new CreateDepartmentCommand(
            request.CompanyId,
            request.Name,
            request.DeptType,
            request.ManagerEmployeeId), ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    /// <summary>แก้ไขแผนก (HR / Admin)</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateDepartmentRequest request,
        CancellationToken ct)
    {
        var result = await mediator.Send(new UpdateDepartmentCommand(
            id,
            request.Name,
            request.DeptType,
            request.ManagerEmployeeId,
            request.IsActive), ct);
        return Ok(result);
    }

    /// <summary>เปิด/ปิดแผนก (HR / Admin)</summary>
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> ToggleStatus(
        Guid id,
        [FromBody] ToggleDepartmentStatusRequest request,
        CancellationToken ct)
    {
        var dept = await mediator.Send(new GetDepartmentByIdQuery(id), ct);
        var result = await mediator.Send(new UpdateDepartmentCommand(
            id,
            dept.Name,
            dept.DeptType,
            dept.ManagerEmployeeId,
            request.IsActive), ct);
        return Ok(result);
    }
}

public record CreateDepartmentRequest(
    Guid CompanyId,
    string Name,
    string? DeptType,
    Guid? ManagerEmployeeId);

public record UpdateDepartmentRequest(
    string Name,
    string? DeptType,
    Guid? ManagerEmployeeId,
    bool IsActive);

public record ToggleDepartmentStatusRequest(bool IsActive);
