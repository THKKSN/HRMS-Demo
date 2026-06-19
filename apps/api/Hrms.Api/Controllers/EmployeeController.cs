using Hrms.Api.Authorization;
using Hrms.Application.Features.Employees.AddEmployeeRole;
using Hrms.Application.Features.Employees.CreateEmployee;
using Hrms.Application.Features.Employees.GetEmployeeById;
using Hrms.Application.Features.Employees.GetEmployeeRoles;
using Hrms.Application.Features.Employees.GetEmployees;
using Hrms.Application.Features.Employees.GetMe;
using Hrms.Application.Features.Employees.GetMeLeaveBalance;
using Hrms.Application.Features.Employees.RemoveEmployeeRole;
using Hrms.Application.Features.Employees.SetPassword;
using Hrms.Application.Features.Employees.ToggleEmployeeStatus;
using Hrms.Application.Features.Employees.UpdateEmployee;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/employees")]
[Authorize]
public class EmployeeController(IMediator mediator) : ControllerBase
{
    /// <summary>ดูข้อมูลตัวเอง</summary>
    [HttpGet("me")]
    public async Task<IActionResult> GetMe(CancellationToken ct)
    {
        var result = await mediator.Send(new GetMeQuery(), ct);
        return Ok(result);
    }

    /// <summary>วันลาคงเหลือของตัวเอง</summary>
    [HttpGet("me/leave-balance")]
    public async Task<IActionResult> GetMeLeaveBalance([FromQuery] int year, CancellationToken ct)
    {
        if (year <= 0) year = DateTime.UtcNow.Year;
        var result = await mediator.Send(new GetMeLeaveBalanceQuery(year), ct);
        return Ok(result);
    }

    /// <summary>รายการพนักงานทั้งหมด (HR / Admin เท่านั้น)</summary>
    [HttpGet]
    [Authorize(Policy = AuthPolicies.RequireHr)]
    public async Task<IActionResult> GetEmployees(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] Guid? companyId = null,
        [FromQuery] bool? isActive = true,
        CancellationToken ct = default)
    {
        var result = await mediator.Send(new GetEmployeesQuery(page, pageSize, search, companyId, isActive), ct);
        return Ok(result);
    }

    /// <summary>รายละเอียดพนักงานรายคน (HR / Admin เท่านั้น)</summary>
    [HttpGet("{id:guid}")]
    [Authorize(Policy = AuthPolicies.RequireHr)]
    public async Task<IActionResult> GetEmployeeById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetEmployeeByIdQuery(id), ct);
        return Ok(result);
    }

    /// <summary>สร้างพนักงานใหม่ (HR / Admin เท่านั้น)</summary>
    [HttpPost]
    [Authorize(Policy = AuthPolicies.RequireHr)]
    public async Task<IActionResult> CreateEmployee(
        [FromBody] CreateEmployeeRequest request,
        CancellationToken ct)
    {
        var result = await mediator.Send(new CreateEmployeeCommand(
            request.EmployeeCode,
            request.FirstName,
            request.LastName,
            request.Email,
            request.Phone,
            request.NationalId,
            request.Password,
            request.HireDate,
            request.DepartmentId,
            request.CompanyId,
            request.RoleLabelId), ct);
        return CreatedAtAction(nameof(GetEmployeeById), new { id = result.Id }, result);
    }

    /// <summary>แก้ไขข้อมูลพนักงาน (HR / Admin เท่านั้น)</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = AuthPolicies.RequireHr)]
    public async Task<IActionResult> UpdateEmployee(
        Guid id,
        [FromBody] UpdateEmployeeRequest request,
        CancellationToken ct)
    {
        var result = await mediator.Send(new UpdateEmployeeCommand(
            id,
            request.FirstName,
            request.LastName,
            request.Email,
            request.Phone,
            request.HireDate,
            request.DepartmentId,
            request.CompanyId,
            request.RoleLabelId), ct);
        return Ok(result);
    }

    /// <summary>เปิด/ปิดการใช้งานพนักงาน (HR / Admin เท่านั้น)</summary>
    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = AuthPolicies.RequireHr)]
    public async Task<IActionResult> ToggleStatus(
        Guid id,
        [FromBody] ToggleStatusRequest request,
        CancellationToken ct)
    {
        await mediator.Send(new ToggleEmployeeStatusCommand(id, request.IsActive), ct);
        return NoContent();
    }

    /// <summary>รายการ role ของพนักงาน (HR / Admin เท่านั้น)</summary>
    [HttpGet("{id:guid}/roles")]
    [Authorize(Policy = AuthPolicies.RequireHr)]
    public async Task<IActionResult> GetRoles(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetEmployeeRolesQuery(id), ct);
        return Ok(result);
    }

    /// <summary>เพิ่ม role ให้พนักงาน (HR / Admin เท่านั้น)</summary>
    [HttpPost("{id:guid}/roles")]
    [Authorize(Policy = AuthPolicies.RequireHr)]
    public async Task<IActionResult> AddRole(
        Guid id,
        [FromBody] AddRoleRequest request,
        CancellationToken ct)
    {
        var result = await mediator.Send(new AddEmployeeRoleCommand(id, request.Role, request.DepartmentId), ct);
        return CreatedAtAction(nameof(GetRoles), new { id }, result);
    }

    /// <summary>ลบ role ของพนักงาน (HR / Admin เท่านั้น)</summary>
    [HttpDelete("{id:guid}/roles/{roleId:guid}")]
    [Authorize(Policy = AuthPolicies.RequireHr)]
    public async Task<IActionResult> RemoveRole(Guid id, Guid roleId, CancellationToken ct)
    {
        await mediator.Send(new RemoveEmployeeRoleCommand(id, roleId), ct);
        return NoContent();
    }

    /// <summary>ตั้ง / รีเซ็ตรหัสผ่านพนักงาน (HR / Admin เท่านั้น)</summary>
    [HttpPut("{id:guid}/password")]
    [Authorize(Policy = AuthPolicies.RequireHr)]
    public async Task<IActionResult> SetPassword(
        Guid id,
        [FromBody] SetPasswordRequest request,
        CancellationToken ct)
    {
        await mediator.Send(new SetPasswordCommand(id, request.NewPassword), ct);
        return NoContent();
    }
}

public record CreateEmployeeRequest(
    string EmployeeCode,
    string FirstName,
    string LastName,
    string? Email,
    string? Phone,
    string? NationalId,
    string Password,
    DateOnly? HireDate,
    Guid? DepartmentId,
    Guid? CompanyId,
    Guid? RoleLabelId);

public record UpdateEmployeeRequest(
    string FirstName,
    string LastName,
    string? Email,
    string? Phone,
    DateOnly? HireDate,
    Guid? DepartmentId,
    Guid? CompanyId,
    Guid? RoleLabelId);

public record ToggleStatusRequest(bool IsActive);
public record SetPasswordRequest(string NewPassword);
public record AddRoleRequest(RoleType Role, Guid? DepartmentId);
