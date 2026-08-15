using Hrms.Api.Authorization;
using Hrms.Application.Features.EmployeeImports.ImportEmployee;
using Hrms.Application.Features.EmployeeImports.PreviewEmployeeImport;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/employee-imports")]
[Authorize(Policy = AuthPolicies.RequireAdmin)]
public sealed class EmployeeImportController(IMediator mediator) : ControllerBase
{
    /// <summary>ค้นหาพนักงานจาก PISWIN เพื่อแสดงตัวอย่างก่อนนำเข้า</summary>
    [HttpPost("preview")]
    public async Task<IActionResult> Preview(
        [FromBody] PreviewEmployeeImportRequest request,
        CancellationToken ct)
    {
        var result = await mediator.Send(new PreviewEmployeeImportCommand(request.NationalId), ct);
        return Ok(result);
    }

    /// <summary>นำเข้าพนักงานจาก PISWIN ไปยังบริษัทที่เลือก</summary>
    [HttpPost]
    public async Task<IActionResult> Import(
        [FromBody] ImportEmployeeRequest request,
        CancellationToken ct)
    {
        var result = await mediator.Send(new ImportEmployeeCommand(request.NationalId, request.CompanyId), ct);
        return CreatedAtAction(
            nameof(EmployeeController.GetEmployeeById),
            "Employee",
            new { id = result.Id },
            result);
    }
}

public sealed record PreviewEmployeeImportRequest(string NationalId);
public sealed record ImportEmployeeRequest(string NationalId, Guid CompanyId);
