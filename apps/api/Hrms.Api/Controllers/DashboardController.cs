using Hrms.Application.Common.Exceptions;
using Hrms.Application.Features.Dashboard.Queries.GetAccessibleCompanies;
using Hrms.Application.Features.Dashboard.Queries.GetAdminDashboard;
using Hrms.Application.Features.Dashboard.Queries.GetCompanyDashboard;
using Hrms.Application.Features.Dashboard.Queries.GetMyDashboard;
using Hrms.Application.Features.Dashboard.Queries.GetTeamDashboard;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/dashboard")]
[Authorize]
public class DashboardController(IMediator mediator) : ControllerBase
{
    /// <summary>ข้อมูลส่วนตัว — ทุก role</summary>
    [HttpGet("my")]
    public async Task<IActionResult> GetMy(CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(new GetMyDashboardQuery(), ct);
            return Ok(result);
        }
        catch (AppUnauthorizedException ex) { return Unauthorized(new { error = ex.Message }); }
    }

    /// <summary>ภาพรวมทีม — Supervisor</summary>
    [HttpGet("team")]
    public async Task<IActionResult> GetTeam(CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(new GetTeamDashboardQuery(), ct);
            return Ok(result);
        }
        catch (AppForbiddenException ex)    { return StatusCode(403, new { error = ex.Message }); }
        catch (AppUnauthorizedException ex) { return Unauthorized(new { error = ex.Message }); }
    }

    /// <summary>ภาพรวมบริษัท — HR / Executive (รองรับ ?companyId= เพื่อ drill-down)</summary>
    [HttpGet("company")]
    public async Task<IActionResult> GetCompany([FromQuery] Guid? companyId, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(new GetCompanyDashboardQuery(companyId), ct);
            return Ok(result);
        }
        catch (AppForbiddenException ex)    { return StatusCode(403, new { error = ex.Message }); }
        catch (AppUnauthorizedException ex) { return Unauthorized(new { error = ex.Message }); }
    }

    /// <summary>รายชื่อบริษัทที่ HR/Executive เข้าถึงได้ (ใช้สำหรับ selector)</summary>
    [HttpGet("companies")]
    public async Task<IActionResult> GetAccessibleCompanies(CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(new GetAccessibleCompaniesQuery(), ct);
            return Ok(result);
        }
        catch (AppUnauthorizedException ex) { return Unauthorized(new { error = ex.Message }); }
    }

    /// <summary>ภาพรวมระบบ — Admin</summary>
    [HttpGet("admin")]
    public async Task<IActionResult> GetAdmin(CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(new GetAdminDashboardQuery(), ct);
            return Ok(result);
        }
        catch (AppForbiddenException ex)    { return StatusCode(403, new { error = ex.Message }); }
        catch (AppUnauthorizedException ex) { return Unauthorized(new { error = ex.Message }); }
    }
}
