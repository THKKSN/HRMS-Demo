using Hrms.Application.Common.Exceptions;
using Hrms.Application.Features.Attendance.Commands.CheckIn;
using Hrms.Application.Features.Attendance.Commands.CheckOut;
using Hrms.Application.Features.Attendance.Queries.GetAttendanceByDate;
using Hrms.Application.Features.Attendance.Queries.GetMyAttendanceHistory;
using Hrms.Application.Features.Attendance.Queries.GetMyAttendanceToday;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/attendance")]
[Authorize]
public class AttendanceController(IMediator mediator) : ControllerBase
{
    /// <summary>สถานะการเข้างานวันนี้ของตัวเอง</summary>
    [HttpGet("me/today")]
    public async Task<IActionResult> GetToday(CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(new GetMyAttendanceTodayQuery(), ct);
            return Ok(result);
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    /// <summary>เช็คอิน</summary>
    [HttpPost("check-in")]
    public async Task<IActionResult> CheckIn([FromBody] CheckInCommand command, CancellationToken ct)
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
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
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

    /// <summary>เช็คเอาท์</summary>
    [HttpPost("check-out")]
    public async Task<IActionResult> CheckOut([FromBody] CheckOutCommand command, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(command, ct);
            return Ok(result);
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

    /// <summary>รายการการมาทำงานทุกคน ทีละวัน (Supervisor/HR/Admin)</summary>
    [HttpGet]
    public async Task<IActionResult> GetByDate(
        [FromQuery] DateOnly? date,
        CancellationToken ct)
    {
        var d = date ?? DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
        try
        {
            var result = await mediator.Send(new GetAttendanceByDateQuery(d), ct);
            return Ok(result);
        }
        catch (AppForbiddenException ex)
        {
            return Forbid();
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    /// <summary>ประวัติการเข้างานของตัวเอง</summary>
    [HttpGet("me")]
    public async Task<IActionResult> GetHistory(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var dateFrom = from ?? DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
        var dateTo   = to   ?? DateOnly.FromDateTime(DateTime.UtcNow);

        try
        {
            var result = await mediator.Send(
                new GetMyAttendanceHistoryQuery(dateFrom, dateTo, page, pageSize), ct);
            return Ok(result);
        }
        catch (AppUnauthorizedException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }
}
