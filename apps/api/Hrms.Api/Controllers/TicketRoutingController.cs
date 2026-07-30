using Hrms.Application.Features.TicketRouting;
using Hrms.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("v1/employee-responsibilities")]
[Authorize]
public class EmployeeResponsibilityController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] Guid companyId, [FromQuery] Guid departmentId,
        [FromQuery] Guid? categoryId, [FromQuery] Guid? topicId, CancellationToken ct)
        => Ok(await mediator.Send(new GetResponsibilitiesQuery(companyId, departmentId, categoryId, topicId), ct));

    [HttpGet("employees")]
    public async Task<IActionResult> Employees(
        [FromQuery] Guid companyId, [FromQuery] Guid departmentId, CancellationToken ct)
        => Ok(await mediator.Send(new GetResponsibilityEmployeesQuery(companyId, departmentId), ct));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateResponsibilityRequest request, CancellationToken ct)
    {
        var result = await mediator.Send(new CreateResponsibilityCommand(
            request.CompanyId, request.DepartmentId, request.CategoryId, request.TopicId,
            request.EmployeeId, request.EffectiveFrom, request.EffectiveTo, request.Note), ct);
        return Created($"/v1/employee-responsibilities/{result.Id}", result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id, [FromBody] UpdateResponsibilityRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateResponsibilityCommand(
            id, request.IsActive, request.EffectiveFrom, request.EffectiveTo,
            request.Note, request.ExpectedUpdatedAt), ct));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Deactivate(Guid id, [FromQuery] DateTime? expectedUpdatedAt, CancellationToken ct)
        => Ok(await mediator.Send(new UpdateResponsibilityCommand(id, false, null, null, null, expectedUpdatedAt, true), ct));
}

[ApiController]
[Route("v1/ticket-routing")]
[Authorize]
public class TicketRoutingController(IMediator mediator) : ControllerBase
{
    [HttpPost("preview")]
    public async Task<IActionResult> Preview([FromBody] TicketRoutingPreviewRequest request, CancellationToken ct)
        => Ok(await mediator.Send(new PreviewTicketRoutingQuery(
            request.CompanyId, request.DepartmentId, request.CategoryId, request.TopicId), ct));

    [HttpGet("coverage")]
    public async Task<IActionResult> Coverage(
        [FromQuery] Guid companyId, [FromQuery] Guid departmentId, CancellationToken ct)
        => Ok(await mediator.Send(new GetTicketRoutingCoverageQuery(companyId, departmentId), ct));
}

public record CreateResponsibilityRequest(
    Guid CompanyId, Guid DepartmentId, Guid CategoryId, Guid? TopicId, Guid EmployeeId,
    DateOnly? EffectiveFrom, DateOnly? EffectiveTo, string? Note);
public record UpdateResponsibilityRequest(
    bool IsActive, DateOnly? EffectiveFrom, DateOnly? EffectiveTo, string? Note, DateTime? ExpectedUpdatedAt);
public record TicketRoutingPreviewRequest(Guid CompanyId, Guid DepartmentId, Guid CategoryId, Guid TopicId);
public record TicketRoutingUpdateRequest(TicketRoutingMode Mode, DateTime? ExpectedUpdatedAt);
public record TicketCategoryRoutingUpdateRequest(
    bool EnableFallback, TicketRoutingMode Mode, DateTime? ExpectedUpdatedAt);
