using Hrms.Api.Authorization;
using Hrms.Application.Features.LeaveTypes.Commands;
using Hrms.Application.Features.LeaveTypes.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/leave-types")]
[Authorize]
public class LeaveTypeController(IMediator mediator) : ControllerBase
{
    /// <summary>ประเภทการลาที่ active ของ company ตัวเอง (ทุก role)</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var result = await mediator.Send(new GetLeaveTypesQuery(), ct);
        return Ok(result);
    }

    /// <summary>สร้างประเภทการลาใหม่ (HR / Admin เท่านั้น)</summary>
    [HttpPost]
    [Authorize(Policy = AuthPolicies.RequireHr)]
    public async Task<IActionResult> Create(
        [FromBody] CreateLeaveTypeRequest request,
        CancellationToken ct)
    {
        var result = await mediator.Send(new CreateLeaveTypeCommand(
            request.Code,
            request.NameTh,
            request.NameEn,
            request.DefaultDaysPerYear,
            request.RequiresAttachment), ct);
        return CreatedAtAction(nameof(GetAll), result);
    }

    /// <summary>แก้ไขประเภทการลา (HR / Admin เท่านั้น)</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = AuthPolicies.RequireHr)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateLeaveTypeRequest request,
        CancellationToken ct)
    {
        var result = await mediator.Send(new UpdateLeaveTypeCommand(
            id,
            request.NameTh,
            request.NameEn,
            request.DefaultDaysPerYear,
            request.RequiresAttachment), ct);
        return Ok(result);
    }

    /// <summary>เปิด/ปิดประเภทการลา (HR / Admin เท่านั้น)</summary>
    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = AuthPolicies.RequireHr)]
    public async Task<IActionResult> ToggleStatus(
        Guid id,
        [FromBody] ToggleLeaveTypeStatusRequest request,
        CancellationToken ct)
    {
        await mediator.Send(new ToggleLeaveTypeStatusCommand(id, request.IsActive), ct);
        return NoContent();
    }
}

public record CreateLeaveTypeRequest(
    string Code,
    string NameTh,
    string? NameEn,
    int DefaultDaysPerYear,
    bool RequiresAttachment);

public record UpdateLeaveTypeRequest(
    string NameTh,
    string? NameEn,
    int DefaultDaysPerYear,
    bool RequiresAttachment);

public record ToggleLeaveTypeStatusRequest(bool IsActive);
