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
[Authorize(Policy = AuthPolicies.RequireHr)]
public class LeaveBalanceController(IMediator mediator) : ControllerBase
{
    /// <summary>ดู balance วันลาของพนักงานทุกคน</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int year,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] Guid? employeeId = null,
        CancellationToken ct = default)
    {
        if (year <= 0) year = DateTime.UtcNow.Year;
        var result = await mediator.Send(new GetLeaveBalancesQuery(page, pageSize, year, employeeId), ct);
        return Ok(result);
    }

    /// <summary>สร้างโควตาวันลาให้พนักงาน 1 คน × 1 ประเภท</summary>
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateLeaveBalanceRequest request,
        CancellationToken ct)
    {
        var result = await mediator.Send(
            new CreateLeaveBalanceCommand(request.EmployeeId, request.LeaveTypeId, request.Year, request.TotalDays), ct);
        return Ok(result);
    }

    /// <summary>ปรับโควตาวันลารายคน</summary>
    [HttpPut("{id:guid}")]
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
    public async Task<IActionResult> Seed(
        [FromBody] SeedLeaveBalanceRequest request,
        CancellationToken ct)
    {
        if (request.Year <= 0)
            return BadRequest(new { error = "กรุณาระบุปี (year) ที่ถูกต้อง" });

        var created = await mediator.Send(new RecalcLeaveBalancesCommand(request.Year, null), ct);
        return Ok(new { created });
    }
}

public record CreateLeaveBalanceRequest(Guid EmployeeId, Guid LeaveTypeId, int Year, decimal TotalDays);
public record AdjustLeaveBalanceRequest(decimal TotalDays);
public record SeedLeaveBalanceRequest(int Year);
