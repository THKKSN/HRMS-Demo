using Hrms.Api.Authorization;
using Hrms.Application.Features.LeaveBalances.Commands.AdjustLeaveBalance;
using Hrms.Application.Features.LeaveBalances.Commands.CreateLeaveBalance;
using Hrms.Application.Features.LeaveBalances.Commands.RecalcLeaveBalances;
using Hrms.Application.Features.LeaveBalances.Queries.GetLeaveBalances;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/leave-balances")]
public class LeaveBalanceController(IMediator mediator) : ControllerBase
{
    /// <summary>ดู balance วันลาของพนักงานทุกคน — Supervisor ขึ้นไปดูได้</summary>
    [HttpGet]
    [Authorize(Policy = AuthPolicies.RequireSupervisor)]
    public async Task<IActionResult> GetAll(
        [FromQuery] int year,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] Guid? employeeId = null,
        [FromQuery] Guid? companyId = null,
        CancellationToken ct = default)
    {
        if (year <= 0) year = DateTime.UtcNow.Year;
        var result = await mediator.Send(new GetLeaveBalancesQuery(page, pageSize, year, employeeId, companyId), ct);
        return Ok(result);
    }

    /// <summary>สร้างสิทธิ์วันลาให้พนักงาน 1 คน × 1 ประเภท</summary>
    [HttpPost]
    [Authorize(Policy = AuthPolicies.RequireHr)]
    public async Task<IActionResult> Create(
        [FromBody] CreateLeaveBalanceRequest request,
        CancellationToken ct)
    {
        var result = await mediator.Send(
            new CreateLeaveBalanceCommand(request.EmployeeId, request.LeaveTypeId, request.Year, request.TotalDays), ct);
        return Ok(result);
    }

    /// <summary>ปรับสิทธิ์วันลารายคน</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = AuthPolicies.RequireHr)]
    public async Task<IActionResult> Adjust(
        Guid id,
        [FromBody] AdjustLeaveBalanceRequest request,
        CancellationToken ct)
    {
        var result = await mediator.Send(new AdjustLeaveBalanceCommand(id, request.TotalDays), ct);
        return Ok(result);
    }

    /// <summary>Seed balance ทุกคน × ทุก leave type ในปีที่ระบุ</summary>
    [HttpPost("seed")]
    [Authorize(Policy = AuthPolicies.RequireHr)]
    public async Task<IActionResult> Seed(
        [FromBody] SeedLeaveBalanceRequest request,
        CancellationToken ct)
    {
        if (request.Year <= 0)
            return BadRequest(new { error = "กรุณาระบุปี (year) ที่ถูกต้อง" });

        var created = await mediator.Send(new RecalcLeaveBalancesCommand(request.Year, request.CompanyId), ct);
        return Ok(new { created });
    }

    /// <summary>Seed balance ให้พนักงาน 1 คน × ทุก leave type ของบริษัทนั้น</summary>
    [HttpPost("seed/employee/{employeeId:guid}")]
    [Authorize(Policy = AuthPolicies.RequireHr)]
    public async Task<IActionResult> SeedForEmployee(
        Guid employeeId,
        [FromBody] SeedForEmployeeRequest request,
        CancellationToken ct)
    {
        var year = request.Year > 0 ? request.Year : DateTime.UtcNow.Year;
        var created = await mediator.Send(new RecalcLeaveBalancesCommand(year, null, employeeId), ct);
        return Ok(new { created });
    }
}

public record CreateLeaveBalanceRequest(Guid EmployeeId, Guid LeaveTypeId, int Year, decimal TotalDays);
public record AdjustLeaveBalanceRequest(decimal TotalDays);
public record SeedLeaveBalanceRequest(int Year, Guid? CompanyId);
public record SeedForEmployeeRequest(int Year);
