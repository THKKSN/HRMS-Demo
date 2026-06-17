using Hrms.Application.Common.Exceptions;
using Hrms.Application.Features.Leaves.Commands.ApproveLeaveRequest;
using Hrms.Application.Features.Leaves.Commands.CancelLeaveRequest;
using Hrms.Application.Features.Leaves.Commands.CreateLeaveRequest;
using Hrms.Application.Features.Leaves.Commands.RejectLeaveRequest;
using Hrms.Application.Features.Leaves.Queries.GetLeaveRequestById;
using Hrms.Application.Features.Leaves.Queries.GetLeaveRequests;
using Hrms.Application.Features.Leaves.Queries.GetPendingApprovals;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/leaves")]
[Authorize]
public class LeaveController(IMediator mediator) : ControllerBase
{
    /// <summary>ขอลา</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateLeaveRequestCommand command, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(command, ct);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (FluentValidation.ValidationException ex)
        {
            return BadRequest(new { errors = ex.Errors.Select(e => e.ErrorMessage) });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    /// <summary>รายการรออนุมัติ (Supervisor เห็น PendingSupervisor, HR เห็น PendingHr)</summary>
    [HttpGet("pending")]
    public async Task<IActionResult> GetPending(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        try
        {
            var result = await mediator.Send(new GetPendingApprovalsQuery(page, pageSize), ct);
            return Ok(result);
        }
        catch (AppForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    /// <summary>รายการคำขอลา (Employee เห็นแค่ของตัวเอง, Supervisor/HR filter ด้วย employeeId ได้)</summary>
    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] LeaveStatus? status = null,
        [FromQuery] Guid? employeeId = null,
        CancellationToken ct = default)
    {
        try
        {
            var result = await mediator.Send(new GetLeaveRequestsQuery(page, pageSize, status, employeeId), ct);
            return Ok(result);
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    /// <summary>ดูรายละเอียดคำขอลา</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(new GetLeaveRequestByIdQuery(id), ct);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (AppForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    /// <summary>อนุมัติคำขอลา (Supervisor / HR)</summary>
    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id, [FromBody] ApproveRejectRequest body, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(new ApproveLeaveRequestCommand(id, body.Comment), ct);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (AppForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    /// <summary>ปฏิเสธคำขอลา (Supervisor / HR)</summary>
    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] ApproveRejectRequest body, CancellationToken ct)
    {
        try
        {
            await mediator.Send(new RejectLeaveRequestCommand(id, body.Comment), ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (AppForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    /// <summary>ยกเลิกคำขอลา</summary>
    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
    {
        try
        {
            await mediator.Send(new CancelLeaveRequestCommand(id), ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (AppForbiddenException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (ConflictException ex)
        {
            return Conflict(new { error = ex.Code, message = ex.Message });
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }
}

public record ApproveRejectRequest(string? Comment);
