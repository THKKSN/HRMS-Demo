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
[Authorize]
public class CompanyController(IMediator mediator) : ControllerBase
{
    /// <summary>รายการบริษัทเป็น tree structure (HR / Admin)</summary>
    [HttpGet]
    [Authorize(Policy = AuthPolicies.RequireHr)]
    public async Task<IActionResult> GetAll(
        [FromQuery] bool includeInactive = false,
        CancellationToken ct = default)
    {
        var result = await mediator.Send(new GetCompaniesQuery(includeInactive), ct);
        return Ok(result);
    }

    /// <summary>รายละเอียดบริษัท (HR / Admin)</summary>
    [HttpGet("{id:guid}")]
    [Authorize(Policy = AuthPolicies.RequireHr)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetCompanyByIdQuery(id), ct);
        return Ok(result);
    }

    /// <summary>สร้างบริษัทใหม่ (Admin เท่านั้น)</summary>
    [HttpPost]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> Create(
        [FromBody] CreateCompanyRequest request,
        CancellationToken ct)
    {
        var result = await mediator.Send(new CreateCompanyCommand(
            request.Name,
            request.NameEn,
            request.OrgType,
            request.ParentId,
            request.IsHeadquarters), ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    /// <summary>แก้ไขบริษัท (HR / Admin — เฉพาะในสังกัด)</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = AuthPolicies.RequireHr)]
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
            request.IsActive,
            request.IsHeadquarters), ct);
        return Ok(result);
    }
}

public record CreateCompanyRequest(
    string Name,
    string? NameEn,
    OrgType OrgType,
    Guid? ParentId,
    bool IsHeadquarters = false);

public record UpdateCompanyRequest(
    string Name,
    string? NameEn,
    Guid? ParentId,
    bool IsActive,
    bool IsHeadquarters = false);
