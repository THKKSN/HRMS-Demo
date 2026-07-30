using Hrms.Application.Common.Exceptions;
using Hrms.Application.Features.Leaves.Commands.ApproveLeaveCancellation;
using Hrms.Application.Features.Leaves.Commands.ApproveLeaveRequest;
using Hrms.Application.Features.Leaves.Commands.CancelLeaveRequest;
using Hrms.Application.Features.Leaves.Commands.CreateLeaveRequest;
using Hrms.Application.Features.Leaves.Commands.RejectLeaveCancellation;
using Hrms.Application.Features.Leaves.Commands.RejectLeaveRequest;
using Hrms.Application.Features.Leaves.Commands.RequestLeaveCancellation;
using Hrms.Application.Features.Leaves.Queries.GetCancellationPending;
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

    /// <summary>รายการคำขอลา (myOnly=true บังคับเห็นแค่ของตัวเอง, Supervisor/HR filter ด้วย employeeId/search/date ได้)</summary>
    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] LeaveStatus? status = null,
        [FromQuery] Guid? employeeId = null,
        [FromQuery] bool myOnly = false,
        [FromQuery] string? search = null,
        [FromQuery] DateOnly? dateFrom = null,
        [FromQuery] DateOnly? dateTo = null,
        CancellationToken ct = default)
    {
        try
        {
            var result = await mediator.Send(
                new GetLeaveRequestsQuery(page, pageSize, status, employeeId, myOnly, search, dateFrom, dateTo), ct);
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

    /// <summary>ยกเลิกคำขอลา (เฉพาะ PendingSupervisor/PendingHr)</summary>
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

    /// <summary>พนักงานยื่นขอยกเลิกการลาที่อนุมัติแล้ว</summary>
    [HttpPost("{id:guid}/request-cancel")]
    public async Task<IActionResult> RequestCancel(Guid id, [FromBody] CancelReasonRequest body, CancellationToken ct)
    {
        try
        {
            await mediator.Send(new RequestLeaveCancellationCommand(id, body.Reason), ct);
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

    /// <summary>รายการคำขอยกเลิกที่รอ HR ดำเนินการ</summary>
    [HttpGet("cancellation-pending")]
    public async Task<IActionResult> GetCancellationPending(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        try
        {
            var result = await mediator.Send(new GetCancellationPendingQuery(page, pageSize), ct);
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

    /// <summary>HR อนุมัติการยกเลิก → status Cancelled + คืนวันลา</summary>
    [HttpPost("{id:guid}/approve-cancel")]
    public async Task<IActionResult> ApproveCancel(Guid id, [FromBody] ApproveRejectRequest body, CancellationToken ct)
    {
        try
        {
            await mediator.Send(new ApproveLeaveCancellationCommand(id, body.Comment), ct);
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

    /// <summary>HR ปฏิเสธการยกเลิก → คืนกลับ Approved</summary>
    [HttpPost("{id:guid}/reject-cancel")]
    public async Task<IActionResult> RejectCancel(Guid id, [FromBody] ApproveRejectRequest body, CancellationToken ct)
    {
        try
        {
            await mediator.Send(new RejectLeaveCancellationCommand(id, body.Comment), ct);
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
public record CancelReasonRequest(string? Reason);
