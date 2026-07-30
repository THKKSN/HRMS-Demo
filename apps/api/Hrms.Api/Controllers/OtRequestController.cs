using Hrms.Application.Common.Exceptions;
using Hrms.Application.Features.OtRequests.Commands.ApproveOtRequest;
using Hrms.Application.Features.OtRequests.Commands.CancelOtRequest;
using Hrms.Application.Features.OtRequests.Commands.CreateOtRequest;
using Hrms.Application.Features.OtRequests.Commands.RejectOtRequest;
using Hrms.Application.Features.OtRequests.Queries.GetOtRequestById;
using Hrms.Application.Features.OtRequests.Queries.GetOtRequests;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/ot-requests")]
[Authorize]
public class OtRequestController(IMediator mediator) : ControllerBase
{
    /// <summary>ยื่นขอ OT</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOtRequestCommand command, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(command, ct);
            return Ok(result);
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

    /// <summary>ดูรายละเอียด OT คำขอเดียว</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(new GetOtRequestByIdQuery(id), ct);
            if (result is null) return NotFound(new { error = "OT_NOT_FOUND" });
            return Ok(result);
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    /// <summary>รายการ OT ของตัวเอง (พนักงาน)</summary>
    [HttpGet("my")]
    public async Task<IActionResult> GetMy(
        [FromQuery] OtStatus? status = null,
        [FromQuery] int? year = null,
        [FromQuery] int? month = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        var result = await mediator.Send(
            new GetOtRequestsQuery(MyOnly: true, Status: status, Year: year, Month: month, Page: page, PageSize: pageSize), ct);
        return Ok(result);
    }

    /// <summary>รายการ OT ของทีม รออนุมัติ (Supervisor)</summary>
    [HttpGet("team")]
    public async Task<IActionResult> GetTeam(
        [FromQuery] OtStatus? status = null,
        [FromQuery] int? year = null,
        [FromQuery] int? month = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        var result = await mediator.Send(
            new GetOtRequestsQuery(TeamOnly: true, Status: status, Year: year, Month: month, Page: page, PageSize: pageSize), ct);
        return Ok(result);
    }

    /// <summary>รายการ OT ทั้งหมดใน scope (HR/Admin รองรับ HQ HR)</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? companyId = null,
        [FromQuery] OtStatus? status = null,
        [FromQuery] int? year = null,
        [FromQuery] int? month = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        var result = await mediator.Send(
            new GetOtRequestsQuery(CompanyId: companyId, Status: status, Year: year, Month: month, Page: page, PageSize: pageSize), ct);
        return Ok(result);
    }

    /// <summary>อนุมัติ OT (Supervisor → PendingHr, HR → Approved)</summary>
    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id, [FromBody] ApproveOtBody body, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(new ApproveOtRequestCommand(id, body.Comment), ct);
            return Ok(result);
        }
        catch (ConflictException ex) { return Conflict(new { error = ex.Code, message = ex.Message }); }
        catch (AppForbiddenException) { return Forbid(); }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
    }

    /// <summary>ปฏิเสธ OT</summary>
    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] RejectOtBody body, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(new RejectOtRequestCommand(id, body.Comment), ct);
            return Ok(result);
        }
        catch (ConflictException ex) { return Conflict(new { error = ex.Code, message = ex.Message }); }
        catch (FluentValidation.ValidationException ex) { return BadRequest(new { errors = ex.Errors.Select(e => e.ErrorMessage) }); }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
    }

    /// <summary>ยกเลิกคำขอ OT (พนักงานยกเลิกก่อนอนุมัติ)</summary>
    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(new CancelOtRequestCommand(id), ct);
            return Ok(result);
        }
        catch (ConflictException ex) { return Conflict(new { error = ex.Code, message = ex.Message }); }
        catch (AppForbiddenException) { return Forbid(); }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
    }
}

public record ApproveOtBody(string? Comment);
public record RejectOtBody(string? Comment);
