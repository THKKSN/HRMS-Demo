using Hrms.Application.Common.Exceptions;
using Hrms.Application.Features.Reports.Queries.ExportAttendanceExcel;
using Hrms.Application.Features.Reports.Queries.GetAttendanceDailySummary;
using Hrms.Application.Features.Reports.Queries.GetAttendanceMonthlySummary;
using Hrms.Application.Features.Reports.Queries.GetAttendanceTrend;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/reports/attendance")]
[Authorize]
public class ReportController(IMediator mediator) : ControllerBase
{
    /// <summary>สรุปการเข้างานรายวัน (KPI cards + Top absent/late)</summary>
    [HttpGet("daily-summary")]
    public async Task<IActionResult> GetDailySummary(
        [FromQuery] DateOnly? date,
        CancellationToken ct = default)
    {
        try
        {
            var result = await mediator.Send(new GetAttendanceDailySummaryQuery(date), ct);
            return Ok(result);
        }
        catch (AppForbiddenException)       { return Forbid(); }
        catch (AppUnauthorizedException ex) { return Unauthorized(new { error = ex.Message }); }
    }

    /// <summary>แนวโน้มการเข้างาน (Line chart)</summary>
    [HttpGet("trend")]
    public async Task<IActionResult> GetTrend(
        [FromQuery] DateOnly? dateFrom,
        [FromQuery] DateOnly? dateTo,
        CancellationToken ct = default)
    {
        try
        {
            var result = await mediator.Send(new GetAttendanceTrendQuery(dateFrom, dateTo), ct);
            return Ok(result);
        }
        catch (AppForbiddenException)       { return Forbid(); }
        catch (AppUnauthorizedException ex) { return Unauthorized(new { error = ex.Message }); }
    }

    /// <summary>สรุปการเข้างานรายเดือนแยกรายคน</summary>
    [HttpGet("monthly-summary")]
    public async Task<IActionResult> GetMonthlySummary(
        [FromQuery] int? year,
        [FromQuery] int? month,
        [FromQuery] Guid? departmentId,
        CancellationToken ct = default)
    {
        var today = DateTime.UtcNow.AddHours(7);
        try
        {
            var result = await mediator.Send(
                new GetAttendanceMonthlySummaryQuery(
                    year  ?? today.Year,
                    month ?? today.Month,
                    departmentId),
                ct);
            return Ok(result);
        }
        catch (AppForbiddenException)       { return Forbid(); }
        catch (AppUnauthorizedException ex) { return Unauthorized(new { error = ex.Message }); }
    }

    /// <summary>Export Excel รายงานเดือน (2 sheet)</summary>
    [HttpGet("export-excel")]
    public async Task<IActionResult> ExportExcel(
        [FromQuery] int? year,
        [FromQuery] int? month,
        [FromQuery] Guid? departmentId,
        CancellationToken ct = default)
    {
        var today = DateTime.UtcNow.AddHours(7);
        try
        {
            var bytes = await mediator.Send(
                new ExportAttendanceExcelQuery(
                    year  ?? today.Year,
                    month ?? today.Month,
                    departmentId),
                ct);

            var fileName = $"attendance_{year ?? today.Year}_{(month ?? today.Month):D2}.xlsx";
            return File(bytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                fileName);
        }
        catch (AppForbiddenException)       { return Forbid(); }
        catch (AppUnauthorizedException ex) { return Unauthorized(new { error = ex.Message }); }
    }
}
