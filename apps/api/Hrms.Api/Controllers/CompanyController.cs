using Hrms.Api.Authorization;
using Hrms.Application.Features.Companies.Commands;
using Hrms.Application.Features.Companies.Queries;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/companies")]
[Authorize(Policy = AuthPolicies.RequireAdmin)]
public class CompanyController(IMediator mediator) : ControllerBase
{
    /// <summary>รายการบริษัททั้งหมดเป็น tree structure (Admin)</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] bool includeInactive = false,
        CancellationToken ct = default)
    {
        var result = await mediator.Send(new GetCompaniesQuery(includeInactive), ct);
        return Ok(result);
    }

    /// <summary>รายละเอียดบริษัท (Admin)</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetCompanyByIdQuery(id), ct);
        return Ok(result);
    }

    /// <summary>สร้างบริษัทใหม่ (Admin)</summary>
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateCompanyRequest request,
        CancellationToken ct)
    {
        var result = await mediator.Send(new CreateCompanyCommand(
            request.Name,
            request.NameEn,
            request.OrgType,
            request.ParentId), ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    /// <summary>แก้ไขบริษัท (Admin)</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateCompanyRequest request,
        CancellationToken ct)
    {
        var result = await mediator.Send(new UpdateCompanyCommand(
            id,
            request.Name,
            request.NameEn,
            request.ParentId,
            request.IsActive), ct);
        return Ok(result);
    }
}

public record CreateCompanyRequest(
    string Name,
    string? NameEn,
    OrgType OrgType,
    Guid? ParentId);

public record UpdateCompanyRequest(
    string Name,
    string? NameEn,
    Guid? ParentId,
    bool IsActive);
