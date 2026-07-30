using Hrms.Application.Common.Exceptions;
using Hrms.Application.Features.Attendance.Commands.CheckIn;
using Hrms.Application.Features.Attendance.Commands.CheckOut;
using Hrms.Application.Features.Attendance.Commands.HrCreateAttendanceRecord;
using Hrms.Application.Features.Attendance.Commands.HrUpdateAttendanceRecord;
using Hrms.Application.Features.Attendance.Queries.GetAttendanceByDate;
using Hrms.Application.Features.Attendance.Queries.GetAttendanceRecordById;
using Hrms.Application.Features.Attendance.Queries.GetAttendanceRecords;
using Hrms.Application.Features.Attendance.Queries.GetEmployeeMonthlyCalendar;
using Hrms.Application.Features.Attendance.Queries.GetEmployeeMonthlyStats;
using Hrms.Application.Features.Attendance.Queries.GetMyAttendanceHistory;
using Hrms.Application.Features.Attendance.Queries.GetMyAttendanceToday;
using Hrms.Domain.Enums;
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
        catch (AppForbiddenException)       { return Forbid(); }
        catch (AppUnauthorizedException ex) { return Unauthorized(new { error = ex.Message }); }
    }

    // ─── HR Attendance Management ───────────────────────────────────────────

    /// <summary>รายการบันทึกการเข้างาน (HR/Admin) — พร้อม filter และ pagination</summary>
    [HttpGet("records")]
    public async Task<IActionResult> GetRecords(
        [FromQuery] Guid? employeeId,
        [FromQuery] Guid? departmentId,
        [FromQuery] DateOnly? dateFrom,
        [FromQuery] DateOnly? dateTo,
        [FromQuery] AttendanceStatus? status,
        [FromQuery] string? search,
        [FromQuery] Guid? companyId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        try
        {
            var result = await mediator.Send(
                new GetAttendanceRecordsQuery(employeeId, departmentId, dateFrom, dateTo, status, search, companyId, page, pageSize), ct);
            return Ok(result);
        }
        catch (AppForbiddenException)  { return Forbid(); }
        catch (AppUnauthorizedException ex) { return Unauthorized(new { error = ex.Message }); }
    }

    /// <summary>ดูบันทึกการเข้างานรายการเดียว (HR/Admin)</summary>
    [HttpGet("records/{id:guid}")]
    public async Task<IActionResult> GetRecordById(Guid id, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(new GetAttendanceRecordByIdQuery(id), ct);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)     { return NotFound(new { error = ex.Message }); }
        catch (AppForbiddenException)       { return Forbid(); }
        catch (AppUnauthorizedException ex) { return Unauthorized(new { error = ex.Message }); }
    }

    /// <summary>HR สร้างบันทึกการเข้างานใหม่ (กรณีลืม check-in)</summary>
    [HttpPost("records")]
    public async Task<IActionResult> CreateRecord(
        [FromBody] HrCreateAttendanceRecordCommand command, CancellationToken ct)
    {
        try
        {
            var id = await mediator.Send(command, ct);
            return CreatedAtAction(nameof(GetRecordById), new { id }, new { id });
        }
        catch (FluentValidation.ValidationException ex)
            { return BadRequest(new { errors = ex.Errors.Select(e => e.ErrorMessage) }); }
        catch (KeyNotFoundException ex)     { return NotFound(new { error = ex.Message }); }
        catch (ConflictException ex)        { return Conflict(new { error = ex.Code, message = ex.Message }); }
        catch (AppForbiddenException)       { return Forbid(); }
        catch (AppUnauthorizedException ex) { return Unauthorized(new { error = ex.Message }); }
    }

    /// <summary>HR แก้ไขบันทึกการเข้างาน</summary>
    [HttpPut("records/{id:guid}")]
    public async Task<IActionResult> UpdateRecord(
        Guid id,
        [FromBody] HrUpdateAttendanceRecordCommand command,
        CancellationToken ct)
    {
        if (id != command.Id)
            return BadRequest(new { error = "ID_MISMATCH" });
        try
        {
            await mediator.Send(command, ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)     { return NotFound(new { error = ex.Message }); }
        catch (AppForbiddenException)       { return Forbid(); }
        catch (AppUnauthorizedException ex) { return Unauthorized(new { error = ex.Message }); }
    }

    // ─── Employee History (HR / Supervisor) ─────────────────────────────────────

    /// <summary>ปฏิทินการเข้างานรายเดือนของพนักงาน (HR/Supervisor)</summary>
    [HttpGet("employees/{employeeId:guid}/monthly-calendar")]
    public async Task<IActionResult> GetMonthlyCalendar(
        Guid employeeId,
        [FromQuery] int? year,
        [FromQuery] int? month,
        CancellationToken ct)
    {
        var today = DateTime.UtcNow.AddHours(7);
        var y = year  ?? today.Year;
        var m = month ?? today.Month;
        try
        {
            var result = await mediator.Send(new GetEmployeeMonthlyCalendarQuery(employeeId, y, m), ct);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)     { return NotFound(new { error = ex.Message }); }
        catch (AppForbiddenException)       { return Forbid(); }
        catch (AppUnauthorizedException ex) { return Unauthorized(new { error = ex.Message }); }
    }

    /// <summary>สถิติการเข้างานรายเดือนของพนักงาน (HR/Supervisor)</summary>
    [HttpGet("employees/{employeeId:guid}/monthly-stats")]
    public async Task<IActionResult> GetMonthlyStats(
        Guid employeeId,
        [FromQuery] int? year,
        [FromQuery] int? month,
        CancellationToken ct)
    {
        var today = DateTime.UtcNow.AddHours(7);
        var y = year  ?? today.Year;
        var m = month ?? today.Month;
        try
        {
            var result = await mediator.Send(new GetEmployeeMonthlyStatsQuery(employeeId, y, m), ct);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)     { return NotFound(new { error = ex.Message }); }
        catch (AppForbiddenException)       { return Forbid(); }
        catch (AppUnauthorizedException ex) { return Unauthorized(new { error = ex.Message }); }
    }

    // ─── Employee Self History ────────────────────────────────────────────────

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
